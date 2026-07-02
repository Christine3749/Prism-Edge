import type { Express } from "express";
import {
  inferMarketSymbolFromInput,
  searchMarketSymbols
} from "../packages/shared/src/marketCatalog";
import type { MarketSymbol } from "../packages/shared/src/types";
import { MAX_QUOTE_SYMBOLS } from "./config";
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

export function registerMarketRoutes(app: Express) {
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

  app.get("/api/news", (req, res) => {
    const asset = (req.query.symbol as string) || "Crypto/Global";
    return res.json({ news: buildNewsItems(asset) });
  });
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
