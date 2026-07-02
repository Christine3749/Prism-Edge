import { inferMarketSymbolFromInput, resolveMarketSymbol } from "../packages/shared/src/marketCatalog";
import { ALPHA_VANTAGE_API_KEY, MARKET_SYMBOL_RE } from "./config";
import { decimalPrecisionFor, normalizeMarketSymbol } from "./marketFormat";
import { toStrictNumber } from "./marketParsers";
import type { Candle, MarketQuotePayload, YahooChartPayload } from "./types";

export const PROVIDER_TIMEOUT_MS = 5200;

export async function fetchJson(url: string, provider: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Prism-Edge market data gateway" },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${provider}: ${response.status} ${text.slice(0, 160)}`);
  const data = JSON.parse(text);
  if (data?.Information || data?.Note) throw new Error(`${provider}: ${data.Information || data.Note}`);
  if (data?.error || data?.Error) throw new Error(`${provider}: ${data.error || data.Error}`);
  return data;
}

export function buildChartPayload(symbol: string, candles: Candle[], source: string): YahooChartPayload {
  const last = candles[candles.length - 1];
  const previous = candles.length > 1 ? candles[candles.length - 2] : undefined;
  const previousClose = previous?.close || last.open || last.close;
  const change24h = previousClose ? ((last.close - previousClose) / previousClose) * 100 : 0;
  return {
    candles,
    source,
    quote: buildQuotePayload(symbol, last.close, change24h, last.volume, source)
  };
}

export function buildQuotePayload(symbol: string, price: number, change24h: number, volume24h: number, source: string): MarketQuotePayload {
  const precision = decimalPrecisionFor(symbol, price);
  return {
    symbol,
    price: Number(price.toFixed(precision)),
    change24h: Number((Number.isFinite(change24h) ? change24h : 0).toFixed(2)),
    volume24h: Number.isFinite(volume24h) ? volume24h : 0,
    source,
    updatedAt: Date.now(),
    isLive: false
  };
}

export function isUsableCandle(candle: Candle) {
  return Number.isFinite(candle.time) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    candle.open > 0 &&
    candle.high > 0 &&
    candle.low > 0 &&
    candle.close > 0 &&
    candle.low <= candle.high;
}

export function getProfile(symbol: string) {
  return resolveMarketSymbol(symbol) || inferMarketSymbolFromInput(symbol);
}

export function isForexLike(symbol: string) {
  const profile = getProfile(symbol);
  if (profile) return profile.type === "forex";
  const normalized = normalizeMarketSymbol(symbol).replace("/", "").replace("=X", "");
  return /^[A-Z]{6}$/.test(normalized) && !normalized.endsWith("USDT");
}

export function isCryptoLike(symbol: string) {
  const profile = getProfile(symbol);
  if (profile) return profile.type === "crypto";
  const normalized = normalizeMarketSymbol(symbol).replace("/", "").replace("-", "");
  return /^[A-Z0-9]{2,16}(USDT|USDC|USD)$/.test(normalized);
}

export function splitForexPair(symbol: string): { base: string; quote: string } | null {
  const profile = getProfile(symbol);
  const fromId = profile?.id?.includes("/") ? profile.id.replace("/", "") : "";
  const normalized = (fromId || normalizeMarketSymbol(symbol)).replace("/", "").replace("=X", "");
  if (!/^[A-Z]{6}$/.test(normalized)) return null;
  return { base: normalized.slice(0, 3), quote: normalized.slice(3, 6) };
}

export function splitCryptoPair(symbol: string): { base: string; quote: string } | null {
  const profile = getProfile(symbol);
  const fromId = profile?.id?.includes("/") ? profile.id.replace("/", "") : "";
  const normalized = (fromId || normalizeMarketSymbol(symbol)).replace("/", "").replace("-", "");
  const quote = ["USDT", "USDC", "USD"].find((candidate) => normalized.endsWith(candidate));
  if (!quote) return null;
  const base = normalized.slice(0, -quote.length);
  if (!base) return null;
  return { base, quote: quote === "USDT" ? "USD" : quote };
}

export function toPolygonTicker(symbol: string) {
  const profile = getProfile(symbol);
  const pair = splitForexPair(symbol);
  const cryptoPair = splitCryptoPair(symbol);
  if (profile?.type === "forex" && pair) return `C:${pair.base}${pair.quote}`;
  if (cryptoPair) return `X:${cryptoPair.base}${cryptoPair.quote}`;
  if (profile?.market === "us" || (!profile && /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))) return normalizeMarketSymbol(symbol);
  return "";
}

export function toTwelveDataSymbol(symbol: string) {
  const profile = getProfile(symbol);
  const pair = splitForexPair(symbol);
  if (pair) return `${pair.base}/${pair.quote}`;
  if (profile?.type === "crypto" && profile.id.includes("/")) return profile.id;
  if (profile?.market === "us") return profile.symbol;
  if (profile?.market === "hk" || profile?.market === "cn") return profile.yahooSymbol || profile.symbol;
  if (!profile && MARKET_SYMBOL_RE.test(symbol)) return normalizeMarketSymbol(symbol);
  return "";
}

export function toFinnhubSymbol(symbol: string) {
  const profile = getProfile(symbol);
  const pair = splitForexPair(symbol);
  const cryptoPair = splitCryptoPair(symbol);
  if (pair) return `OANDA:${pair.base}_${pair.quote}`;
  if (cryptoPair) return `BINANCE:${cryptoPair.base}${cryptoPair.quote === "USD" ? "USDT" : cryptoPair.quote}`;
  if (profile?.market === "us" || (!profile && /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))) return normalizeMarketSymbol(symbol);
  return "";
}

export function providerRawLimitForInterval(interval: string, limit: number) {
  const normalized = interval.toLowerCase();
  const multiplier = normalized === "4h" ? 4 : normalized === "2h" ? 2 : 1;
  return Math.max(limit, Math.min(5000, Math.ceil(limit * multiplier + multiplier)));
}

export function toTwelveDataInterval(interval: string) {
  switch (interval) {
    case "1m": return "1min";
    case "3m": return "5min";
    case "5m": return "5min";
    case "15m": return "15min";
    case "30m": return "30min";
    case "1h": return "1h";
    case "2h": return "2h";
    case "4h": return "4h";
    case "1w": return "1week";
    case "1M": return "1month";
    default: return "1day";
  }
}

export function toFinnhubResolution(interval: string) {
  switch (interval) {
    case "1m": return "1";
    case "3m":
    case "5m": return "5";
    case "15m": return "15";
    case "30m": return "30";
    case "1h":
    case "2h":
    case "4h": return "60";
    case "1w": return "W";
    case "1M": return "M";
    default: return "D";
  }
}

export function toPolygonRange(interval: string, limit: number) {
  const base = Math.max(limit, 80);
  switch (interval) {
    case "1m": return { multiplier: 1, timespan: "minute", lookbackSeconds: base * 60 * 2 };
    case "3m": return { multiplier: 3, timespan: "minute", lookbackSeconds: base * 180 * 2 };
    case "5m": return { multiplier: 5, timespan: "minute", lookbackSeconds: base * 300 * 2 };
    case "15m": return { multiplier: 15, timespan: "minute", lookbackSeconds: base * 900 * 2 };
    case "30m": return { multiplier: 30, timespan: "minute", lookbackSeconds: base * 1800 * 2 };
    case "1h": return { multiplier: 1, timespan: "hour", lookbackSeconds: base * 3600 * 2 };
    case "2h": return { multiplier: 2, timespan: "hour", lookbackSeconds: base * 7200 * 2 };
    case "4h": return { multiplier: 4, timespan: "hour", lookbackSeconds: base * 14400 * 2 };
    case "1w": return { multiplier: 1, timespan: "week", lookbackSeconds: base * 604800 * 2 };
    case "1M": return { multiplier: 1, timespan: "month", lookbackSeconds: base * 2678400 * 2 };
    default: return { multiplier: 1, timespan: "day", lookbackSeconds: base * 86400 * 2 };
  }
}

export function lookbackSecondsFor(interval: string, limit: number) {
  const step = interval === "1m" ? 60 :
    interval === "3m" ? 180 :
    interval === "5m" ? 300 :
    interval === "15m" ? 900 :
    interval === "30m" ? 1800 :
    interval === "1h" ? 3600 :
    interval === "2h" ? 7200 :
    interval === "4h" ? 14400 :
    interval === "1w" ? 604800 :
    interval === "1M" ? 2678400 :
    86400;
  return Math.max(limit, 80) * step * 3;
}

export function toDateOnly(seconds: number) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

export function parseProviderTime(value: unknown) {
  if (typeof value === "number") return value > 10_000_000_000 ? Math.round(value / 1000) : value;
  const text = String(value || "").trim();
  if (!text) return 0;
  const parsed = Date.parse(text.includes("T") ? text : `${text}T00:00:00Z`);
  return Number.isFinite(parsed) ? Math.round(parsed / 1000) : 0;
}

export async function fetchAlphaVantageForexSeries(symbol: string, interval: string) {
  const pair = splitForexPair(symbol);
  if (!pair) throw new Error(`Alpha Vantage ${symbol}: invalid forex pair.`);
  const intraday = ["1m", "5m", "15m", "30m", "1h", "2h", "4h"].includes(interval);
  const params = new URLSearchParams({
    function: intraday ? "FX_INTRADAY" : interval === "1w" ? "FX_WEEKLY" : interval === "1M" ? "FX_MONTHLY" : "FX_DAILY",
    from_symbol: pair.base,
    to_symbol: pair.quote,
    apikey: ALPHA_VANTAGE_API_KEY,
    outputsize: "compact"
  });
  if (intraday) params.set("interval", interval === "1m" ? "1min" : interval === "5m" ? "5min" : interval === "15m" ? "15min" : interval === "30m" ? "30min" : "60min");
  return fetchJson(`https://www.alphavantage.co/query?${params.toString()}`, "Alpha Vantage");
}

export async function fetchAlphaVantageStockSeries(symbol: string, interval: string) {
  const normalized = normalizeMarketSymbol(symbol);
  const intraday = ["1m", "5m", "15m", "30m", "1h", "2h", "4h"].includes(interval);
  const params = new URLSearchParams({
    function: intraday ? "TIME_SERIES_INTRADAY" : interval === "1w" ? "TIME_SERIES_WEEKLY" : interval === "1M" ? "TIME_SERIES_MONTHLY" : "TIME_SERIES_DAILY",
    symbol: normalized,
    apikey: ALPHA_VANTAGE_API_KEY,
    outputsize: "compact"
  });
  if (intraday) params.set("interval", interval === "1m" ? "1min" : interval === "5m" ? "5min" : interval === "15m" ? "15min" : interval === "30m" ? "30min" : "60min");
  return fetchJson(`https://www.alphavantage.co/query?${params.toString()}`, "Alpha Vantage");
}

export async function fetchAlphaVantageCryptoSeries(symbol: string, interval: string) {
  const pair = splitCryptoPair(symbol);
  if (!pair) throw new Error(`Alpha Vantage ${symbol}: invalid crypto pair.`);
  const params = new URLSearchParams({
    function: interval === "1w" ? "DIGITAL_CURRENCY_WEEKLY" : interval === "1M" ? "DIGITAL_CURRENCY_MONTHLY" : "DIGITAL_CURRENCY_DAILY",
    symbol: pair.base,
    market: pair.quote,
    apikey: ALPHA_VANTAGE_API_KEY
  });
  return fetchJson(`https://www.alphavantage.co/query?${params.toString()}`, "Alpha Vantage");
}

export function parseAlphaTimeSeries(data: any): Candle[] {
  const key = Object.keys(data || {}).find((item) => item.toLowerCase().includes("time series"));
  const series = key ? data[key] : null;
  if (!series || typeof series !== "object") return [];

  return Object.entries(series).map(([time, row]: [string, any]) => {
    const open = readAlphaNumber(row, "open");
    const high = readAlphaNumber(row, "high");
    const low = readAlphaNumber(row, "low");
    const close = readAlphaNumber(row, "close");
    return {
      time: parseProviderTime(time),
      open: open ?? 0,
      high: high ?? 0,
      low: low ?? 0,
      close: close ?? 0,
      volume: readAlphaNumber(row, "volume") || 0
    };
  }).filter(isUsableCandle).sort((a, b) => a.time - b.time);
}

export function readAlphaNumber(row: Record<string, unknown>, field: string) {
  const entry = Object.entries(row || {}).find(([key]) => key.toLowerCase().includes(field));
  return entry ? toStrictNumber(entry[1]) : undefined;
}
