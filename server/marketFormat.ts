import {
  inferMarketSymbolFromInput,
  resolveMarketSymbol
} from "../packages/shared/src/marketCatalog";
import { MARKET_SYMBOL_RE } from "./config";
import { clamp } from "./math";

export function toBinanceInterval(timeframe: string | undefined) {
  const tf = (timeframe || "1D").trim();
  if (tf.endsWith("M")) return "1M";

  const normalized = tf.toLowerCase();
  const supported = new Set(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w"]);
  return supported.has(normalized) ? normalized : "1d";
}

export function toCoinbaseGranularity(interval: string) {
  switch (interval) {
    case "1m": return 60;
    case "5m": return 300;
    case "15m": return 900;
    case "1h": return 3600;
    case "4h": return 21600;
    case "1w": return 604800;
    case "1d":
    case "1M":
    default: return 86400;
  }
}

export function toCoinbaseProductId(symbol: string) {
  const quotes = ["USDT", "USDC", "USD", "EUR", "BTC", "ETH"];
  const quote = quotes.find((candidate) => symbol.endsWith(candidate));
  if (!quote) return symbol;
  const base = symbol.slice(0, -quote.length);
  return `${base}-${quote}`;
}

export function normalizeMarketSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\s+/g, "");
}

export function isCryptoMarketSymbol(symbol: string) {
  const profile = resolveMarketSymbol(symbol);
  if (profile) return profile.type === "crypto";
  return /^[A-Z0-9]{3,16}USDT$/.test(symbol);
}

export function toYahooSymbol(symbol: string) {
  const profile = resolveMarketSymbol(symbol) || inferMarketSymbolFromInput(symbol);
  if (profile?.yahooSymbol) return profile.yahooSymbol;

  const normalized = normalizeMarketSymbol(symbol).replace("/", "");
  if (/^[A-Z]{6}$/.test(normalized) && !normalized.endsWith("USDT")) {
    return `${normalized}=X`;
  }
  return normalized;
}

export function toYahooInterval(interval: string) {
  switch (interval) {
    case "1m": return "1m";
    case "3m":
    case "5m": return "5m";
    case "15m":
    case "30m": return "15m";
    case "1h":
    case "2h":
    case "4h": return "1h";
    case "1w": return "1wk";
    case "1M": return "1mo";
    default: return "1d";
  }
}

export function toYahooRange(interval: string, limit: number) {
  if (interval === "1m") return "1d";
  if (["3m", "5m", "15m", "30m"].includes(interval)) return "5d";
  if (["1h", "2h", "4h"].includes(interval)) return "3mo";
  if (interval === "1w") return limit > 260 ? "10y" : "5y";
  if (interval === "1M") return "max";
  return limit > 260 ? "5y" : "1y";
}

export function decimalPrecisionFor(symbol: string, price: number) {
  const profile = resolveMarketSymbol(symbol) || inferMarketSymbolFromInput(symbol);
  if (profile) return profile.precision;
  if (price < 5) return 5;
  return 2;
}

export function parseLimit(rawLimit: unknown) {
  const parsed = Number(rawLimit || 200);
  if (!Number.isFinite(parsed)) return 200;
  return clamp(Math.floor(parsed), 1, 500);
}

export function isValidMarketSymbol(symbol: string) {
  return MARKET_SYMBOL_RE.test(symbol);
}
