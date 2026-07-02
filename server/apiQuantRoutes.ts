import type { Express } from "express";
import {
  inferMarketSymbolFromInput,
  resolveMarketSymbol
} from "../packages/shared/src/marketCatalog";
import { computeLocalAnalysis } from "./analysisFallback";
import { computeLocalBacktest } from "./backtestFallback";
import { ANALYSIS_RATE_LIMIT, INTERNAL_API_KEY } from "./config";
import { checkHsFeature } from "./hsMembership";
import { clamp } from "./math";
import {
  isCryptoMarketSymbol,
  isValidMarketSymbol,
  normalizeMarketSymbol,
  toBinanceInterval
} from "./marketFormat";
import { getKlinePayload } from "./marketGateway";
import { checkRateLimit } from "./rateLimiter";

export function registerQuantRoutes(app: Express, apiBaseUrl: string) {
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
