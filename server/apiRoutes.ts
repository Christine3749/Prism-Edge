import type { Express } from "express";
import {
  inferMarketSymbolFromInput,
  searchMarketSymbols
} from "../packages/shared/src/marketCatalog";
import type { MarketSymbol } from "../packages/shared/src/types";
import { computeLocalAnalysis } from "./analysisFallback";
import { computeLocalBacktest } from "./backtestFallback";
import { API_CACHE_CONTROL, MAX_QUOTE_SYMBOLS } from "./config";
import { clamp } from "./math";
import {
  isValidMarketSymbol,
  normalizeMarketSymbol,
  parseLimit,
  toBinanceInterval
} from "./marketFormat";
import { getKlinePayload, getQuotePayload } from "./marketGateway";
import { fetchYahooSearch } from "./marketProviders";
import { buildNewsItems } from "./newsRoute";

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
    const upstreamUrl = `${apiBaseUrl}/api/analysis/run`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  app.post("/api/quant/state/compile", async (req, res) => {
    return proxyJsonPost(res, `${apiBaseUrl}/api/quant/state/compile`, req.body);
  });

  app.post("/api/quant/decision/run", async (req, res) => {
    return proxyJsonPost(res, `${apiBaseUrl}/api/quant/decision/run`, req.body);
  });

  app.post("/api/backtest/run", async (req, res) => {
    try {
      return await proxyJsonPostOrThrow(res, `${apiBaseUrl}/api/backtest/run`, req.body, true);
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

async function proxyGet(res: any, upstreamUrl: string) {
  try {
    const response = await fetch(upstreamUrl, { signal: AbortSignal.timeout(2500) });
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

async function proxyJsonPost(res: any, upstreamUrl: string, body: unknown) {
  try {
    return await proxyJsonPostOrThrow(res, upstreamUrl, body);
  } catch (error: any) {
    return res.status(502).json({ error: "FastAPI route unavailable.", detail: error?.message || String(error) });
  }
}

async function proxyJsonPostOrThrow(res: any, upstreamUrl: string, body: unknown, throwOnHttpError = false) {
  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000)
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
