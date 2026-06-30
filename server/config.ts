import { MARKET_SYMBOLS } from "../packages/shared/src/marketCatalog";
import type { MarketQuotePayload } from "./types";

export const PORT = Number(process.env.PORT || 3000);
export const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";
export const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";
export const ANALYSIS_RATE_LIMIT = Number(process.env.ANALYSIS_RATE_LIMIT || 20);
export const API_CACHE_CONTROL = "no-store, max-age=0";
export const HTML_CACHE_CONTROL = "no-cache, max-age=0, must-revalidate";
export const STATIC_ASSET_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=86400";

export const BINANCE_ENDPOINTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com"
];

export const POLYGON_API_KEY = process.env.POLYGON_API_KEY || process.env.MASSIVE_API_KEY || "";
export const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "";
export const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "";
export const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";

export const MARKET_SYMBOL_RE = /^[A-Z0-9.^=\-/]{1,36}$/;
export const QUOTE_CACHE_TTL_MS = 6000;
export const QUOTE_FAST_WAIT_MS = 900;
export const MAX_QUOTE_SYMBOLS = 80;

export const FALLBACK_QUOTES: Record<string, Omit<MarketQuotePayload, "source" | "updatedAt" | "isLive">> =
  Object.fromEntries(
    MARKET_SYMBOLS.map((symbol) => [
      symbol.symbol,
      {
        symbol: symbol.symbol,
        price: symbol.price,
        change24h: symbol.change24h,
        volume24h: symbol.volume24h
      }
    ])
  );
