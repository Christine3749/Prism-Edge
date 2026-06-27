import type { Express } from "express";
import {
  inferMarketSymbolFromInput,
  resolveMarketSymbol,
  searchMarketSymbols
} from "../packages/shared/src/marketCatalog";
import type { MarketSymbol } from "../packages/shared/src/types";
import { computeLocalAnalysis } from "./analysisFallback";
import { computeLocalBacktest } from "./backtestFallback";
import { ANALYSIS_RATE_LIMIT, API_CACHE_CONTROL, INTERNAL_API_KEY, MAX_QUOTE_SYMBOLS } from "./config";
import { clamp } from "./math";
import { checkRateLimit } from "./rateLimiter";
import {
  isCryptoMarketSymbol,
  isValidMarketSymbol,
  normalizeMarketSymbol,
  parseLimit,
  toBinanceInterval
} from "./marketFormat";
import { getKlinePayload, getQuotePayload } from "./marketGateway";
import { fetchYahooSearch } from "./marketProviders";
import { buildNewsItems } from "./newsRoute";
import { checkHsFeature, getHsMembershipForRequest, hsProductCode } from "./hsMembership";

export function registerApiRoutes(app: Express, apiBaseUrl: string) {
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", API_CACHE_CONTROL);
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  app.get("/api/health", async (_req, res) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
      const payload = await response.json();
      return res.status(response.status).json(payload);
    } catch {
      return res.json({
        status: "degraded",
        web: "ok",
        apiBaseUrl,
        message: "FastAPI service is not reachable; Node fallback is active."
      });
    }
  });

  app.get("/api/membership/me", async (req, res) => {
    const result = await getHsMembershipForRequest(req);
    if (result.ok === false) return res.status(result.status).json(result.payload);
    return res.json(result.snapshot);
  });

  app.post("/api/auth/login", async (req, res) => {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "INVALID_LOGIN_REQUEST", message: "Email and password are required." });
    }

    try {
      const payload = await hsAuthRequest("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      return res.json({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_at: payload.expires_at,
        token_type: payload.token_type,
        user: payload.user ? { id: payload.user.id, email: payload.user.email } : null
      });
    } catch (error: any) {
      return res.status(error.status || 502).json({
        error: error.code || "MSIR_LOGIN_FAILED",
        message: error.message || "MSIR Prism login failed."
      });
    }
  });

  app.post("/api/membership/activate-free", async (req, res) => {
    const token = readBearerTokenFromHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Please sign in before activating membership." });
    }

    try {
      const payload = await hsAuthRequest("/rest/v1/rpc/hs_activate_free_membership", {
        method: "POST",
        token,
        body: JSON.stringify({ target_product_code: hsProductCode() })
      });
      return res.json({ ok: true, membership: payload });
    } catch (error: any) {
      return res.status(error.status || 502).json({
        error: error.code || "MEMBERSHIP_ACTIVATION_FAILED",
        message: error.message || "Unable to activate MSIR Prism membership."
      });
    }
  });

  app.get("/api/market/klines", async (req, res) => {
    const symbol = normalizeMarketSymbol(String(req.query.symbol || ""));
    const interval = toBinanceInterval(String(req.query.interval || req.query.timeframe || "1D"));
    const limit = parseLimit(req.query.limit);

    if (!isValidMarketSymbol(symbol)) {
      return res.status(400).json({ error: "Invalid market symbol." });
    }

    try {
      return res.json(await getKlinePayload(symbol, interval, limit));
    } catch (error: any) {
      console.warn(`Market data gateway failed for ${symbol} ${interval}.`, error);
      return res.status(502).json({
        error: "Market data gateway unavailable.",
        detail: error?.message || String(error)
      });
    }
  });

  app.get("/api/market/quote", async (req, res) => {
    const rawSymbols = String(req.query.symbols || req.query.symbol || "").toUpperCase();
    const symbols = rawSymbols
      .split(",")
      .map((item) => normalizeMarketSymbol(item))
      .filter(Boolean)
      .slice(0, MAX_QUOTE_SYMBOLS);

    if (symbols.length === 0 || symbols.some((symbol) => !isValidMarketSymbol(symbol))) {
      return res.status(400).json({ error: "Invalid market symbol list." });
    }

    return res.json(await getQuotePayload(symbols));
  });

  app.get("/api/market/search", async (req, res) => {
    const query = String(req.query.q || req.query.query || "").trim();
    const market = String(req.query.market || "all").trim().toLowerCase();
    const rawLimit = Number(req.query.limit || 30);
    const limit = Number.isFinite(rawLimit) ? clamp(rawLimit, 1, 80) : 30;

    const merged = new Map<string, MarketSymbol>();
    searchMarketSymbols(query, market, Math.ceil(limit / 2)).forEach((symbol) => {
      merged.set(symbol.symbol, symbol);
    });

    if (query.length >= 2) {
      await mergeYahooSearchResults(query, market, limit, merged);
    }

    const exact = inferMarketSymbolFromInput(query);
    if (exact && !merged.has(exact.symbol)) {
      merged.set(exact.symbol, exact);
    }

    const results = Array.from(merged.values()).slice(0, limit);
    return res.json({
      results,
      count: results.length,
      source: query.length >= 2 ? "catalog+yahoo" : "catalog"
    });
  });

  app.post("/api/analysis/run", async (req, res) => {
    const clientIp = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown");
    if (!checkRateLimit(`analysis:${clientIp}`, ANALYSIS_RATE_LIMIT)) {
      return res.status(429).json({ error: "Rate limit exceeded. Please wait before running another analysis." });
    }

    if (!(await allowHsFeature(req, res, "quant_lab"))) return;

    const upstreamUrl = `${apiBaseUrl}/api/analysis/run`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(upstreamUrl, {
        method: "POST",
        headers: buildInternalHeaders(),
        body: JSON.stringify(req.body),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const contentType = response.headers.get("content-type") || "application/json";
      const text = await response.text();
      return res.status(response.status).type(contentType).send(text);
    } catch (error) {
      console.warn(`FastAPI analysis endpoint unavailable at ${upstreamUrl}. Serving local fallback.`, error);
      try {
        return res.json(computeLocalAnalysis(req.body));
      } catch (fallbackError: any) {
        return res.status(400).json({ error: fallbackError.message || "Invalid analysis request." });
      }
    }
  });

  app.get("/api/quant/health", async (_req, res) => {
    return proxyQuantHealth(res, `${apiBaseUrl}/api/quant/health`);
  });

  app.get("/api/quant/models", async (req, res) => {
    if (!(await allowHsFeature(req, res, "model_registry"))) return;
    return proxyGet(res, `${apiBaseUrl}/api/quant/models`, 20000);
  });

  app.post("/api/quant/state/compile", async (req, res) => {
    if (!(await allowHsFeature(req, res, "quant_lab"))) return;
    return proxyJsonPost(res, `${apiBaseUrl}/api/quant/state/compile`, req.body);
  });

  app.post("/api/quant/decision/run", async (req, res) => {
    const featureKey = isRecord(req.body) && isDgwmRuntimeRequest(req.body)
      ? "runtime_diagnostic"
      : "quant_lab";
    if (!(await allowHsFeature(req, res, featureKey))) return;
    const body = await enrichDgwmRuntimeBody(req.body);
    return proxyJsonPost(res, `${apiBaseUrl}/api/quant/decision/run`, body, 150000);
  });

  app.post("/api/backtest/run", async (req, res) => {
    if (!(await allowHsFeature(req, res, "backtest"))) return;
    try {
      return await proxyJsonPostOrThrow(res, `${apiBaseUrl}/api/backtest/run`, req.body, true, 30000);
    } catch {
      try {
        return res.json(computeLocalBacktest(req.body));
      } catch (fallbackError: any) {
        return res.status(400).json({ error: fallbackError.message || "Invalid backtest request." });
      }
    }
  });

  app.get("/api/news", (req, res) => {
    const asset = (req.query.symbol as string) || "Crypto/Global";
    return res.json({ news: buildNewsItems(asset) });
  });

  app.use("/api", (_req, res) => {
    return res.status(404).json({ error: "API route not found." });
  });
}

async function allowHsFeature(req: any, res: any, featureKey: string) {
  const gate = await checkHsFeature(req, featureKey);
  if (gate.allowed === false) {
    res.status(gate.status).json(gate.payload);
    return false;
  }

  if (gate.warning) {
    res.setHeader("X-HS-Membership-Warning", gate.warning);
  }
  res.setHeader("X-HS-Product-Code", gate.snapshot.productCode);
  res.setHeader("X-HS-Plan-Code", gate.snapshot.subscription.planCode || "");
  return true;
}

function buildInternalHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(INTERNAL_API_KEY ? { "X-Internal-Key": INTERNAL_API_KEY } : {}),
    ...extra,
  };
}

async function proxyGet(res: any, upstreamUrl: string, timeoutMs = 2500) {
  try {
    const response = await fetch(upstreamUrl, {
      headers: INTERNAL_API_KEY ? { "X-Internal-Key": INTERNAL_API_KEY } : {},
      signal: AbortSignal.timeout(timeoutMs),
    });
    const contentType = response.headers.get("content-type") || "application/json";
    const text = await response.text();
    return res.status(response.status).type(contentType).send(text);
  } catch (error: any) {
    return res.status(502).json({ error: "FastAPI route unavailable.", detail: error?.message || String(error) });
  }
}

async function proxyQuantHealth(res: any, upstreamUrl: string) {
  try {
    const response = await fetch(upstreamUrl, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) throw new Error(`FastAPI health returned ${response.status}`);
    const contentType = response.headers.get("content-type") || "application/json";
    const text = await response.text();
    return res.status(response.status).type(contentType).send(text);
  } catch (error: any) {
    return res.json({
      adapter: "node-quant-bridge",
      root: "",
      exists: false,
      importable: false,
      files: { fastapiRoute: false },
      detail: error?.message || String(error)
    });
  }
}

async function proxyJsonPost(res: any, upstreamUrl: string, body: unknown, timeoutMs = 5000) {
  try {
    return await proxyJsonPostOrThrow(res, upstreamUrl, body, false, timeoutMs);
  } catch (error: any) {
    return res.status(502).json({ error: "FastAPI route unavailable.", detail: error?.message || String(error) });
  }
}

async function proxyJsonPostOrThrow(
  res: any,
  upstreamUrl: string,
  body: unknown,
  throwOnHttpError = false,
  timeoutMs = 5000
) {
  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: buildInternalHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });
    const contentType = response.headers.get("content-type") || "application/json";
    const text = await response.text();
    if (throwOnHttpError && !response.ok) {
      throw new Error(`FastAPI route returned ${response.status}: ${text}`);
    }
    return res.status(response.status).type(contentType).send(text);
  } catch (error: any) {
    throw new Error(error?.message || String(error));
  }
}

async function enrichDgwmRuntimeBody(body: unknown) {
  if (!isRecord(body) || !isDgwmRuntimeRequest(body)) return body;

  const primary = normalizeMarketSymbol(String(body.symbol || ""));
  if (!primary || !isValidMarketSymbol(primary)) return body;

  const interval = toBinanceInterval(String(body.interval || body.timeframe || "1D"));
  const candles = normalizeCandles(body.candles);
  const targetBars = clamp(Math.max(candles.length, 180), 180, 260);
  const primaryCandles = candles.length >= targetBars
    ? candles.slice(-targetBars)
    : await fetchGatewayCandles(primary, interval, targetBars).catch(() => candles);

  const candlesBySymbol: Record<string, unknown[]> = {
    ...(isRecord(body.candlesBySymbol) ? body.candlesBySymbol as Record<string, unknown[]> : {}),
    [primary]: primaryCandles
  };

  const requestedUniverse = deriveDgwmUniverse(primary);
  const peers = requestedUniverse.filter((symbol) => symbol !== primary);
  const peerResults = await Promise.allSettled(
    peers.map(async (symbol) => [symbol, await fetchGatewayCandles(symbol, interval, targetBars)] as const)
  );

  for (const result of peerResults) {
    if (result.status !== "fulfilled") continue;
    const [symbol, rows] = result.value;
    if (rows.length >= 30) {
      candlesBySymbol[symbol] = rows.slice(-targetBars);
    }
  }

  const availableUniverse = Object.keys(candlesBySymbol).slice(0, 10);
  const context = isRecord(body.context) ? body.context : {};
  return {
    ...body,
    symbol: primary,
    interval,
    candles: primaryCandles,
    symbols: availableUniverse,
    candlesBySymbol,
    context: {
      ...context,
      dgwmRuntime: context.dgwmRuntime || "diagnostic",
      dgwmUniverse: availableUniverse,
      dgwmUniverseSource: "node-market-gateway",
      dgwmUniverseTargetBars: targetBars,
      maxProfileRank: context.maxProfileRank || 64,
      maxCandidateActions: context.maxCandidateActions || 7,
      historySize: context.historySize || 5,
      maxTurnover: context.maxTurnover || 0.7,
      maxPosition: context.maxPosition || 0.35
    }
  };
}

function isDgwmRuntimeRequest(body: Record<string, unknown>) {
  const context = isRecord(body.context) ? body.context : {};
  const mode = String(context.dgwmRuntime || context.runtime || "").trim().toLowerCase();
  return ["diagnostic", "real", "dgwm", "dgwm-diagnostic"].includes(mode);
}

async function fetchGatewayCandles(symbol: string, interval: string, limit: number) {
  const payload = await getKlinePayload(symbol, interval, limit);
  return normalizeCandles(payload.candles);
}

function normalizeCandles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } => (
    isRecord(item) &&
    Number.isFinite(item.time) &&
    Number.isFinite(item.open) &&
    Number.isFinite(item.high) &&
    Number.isFinite(item.low) &&
    Number.isFinite(item.close)
  ));
}

function deriveDgwmUniverse(primary: string) {
  const profile = resolveMarketSymbol(primary) || inferMarketSymbolFromInput(primary);
  const market = profile?.market || (isCryptoMarketSymbol(primary) ? "crypto" : "us");
  const templates: Record<string, string[]> = {
    crypto: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT"],
    cn: ["000001.SS", "000300.SS", "399001.SZ", "399006.SZ", "600519.SS", "300750.SZ"],
    hk: ["^HSI", "2800.HK", "3033.HK", "0700.HK", "9988.HK", "3690.HK"],
    forex: ["EURUSD", "USDJPY", "GBPUSD", "AUDUSD", "USDCNH", "XAUUSD"],
    us: ["SPY", "QQQ", "DIA", "IWM", "NVDA", "MSFT"]
  };
  const template = templates[market] || templates.us;
  return Array.from(new Set([primary, ...template].map(normalizeMarketSymbol)))
    .filter((symbol) => isValidMarketSymbol(symbol))
    .slice(0, 6);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
async function mergeYahooSearchResults(
  query: string,
  market: string,
  limit: number,
  merged: Map<string, MarketSymbol>
) {
  try {
    const remoteResults = await fetchYahooSearch(query, limit);
    remoteResults.forEach((symbol) => {
      const matchesMarket = market === "all" || symbol.market === market || symbol.type === market;
      if (matchesMarket && !merged.has(symbol.symbol)) {
        merged.set(symbol.symbol, symbol);
      }
    });
  } catch (error) {
    console.warn(`Market search remote provider failed for "${query}".`, error);
  }
}
async function hsAuthRequest(path: string, options: { method: "GET" | "POST"; body?: string; token?: string }) {
  const baseUrl = String(process.env.HS_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = String(process.env.HS_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "");
  if (!baseUrl || !anonKey) {
    throw Object.assign(new Error("MSIR Prism membership login service is not configured."), {
      status: 503,
      code: "HS_AUTH_NOT_CONFIGURED"
    });
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${options.token || anonKey}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: options.body,
    signal: AbortSignal.timeout(8000)
  });

  const text = await response.text();
  let payload: any = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message = String(payload.msg || payload.message || payload.error_description || payload.error || `HS request failed with ${response.status}`);
    const code = response.status === 401 || response.status === 400 ? "INVALID_CREDENTIALS" : "HS_AUTH_REQUEST_FAILED";
    throw Object.assign(new Error(message), { status: response.status, code });
  }

  return payload;
}

function readBearerTokenFromHeader(header: unknown) {
  const value = Array.isArray(header) ? header[0] : String(header || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

