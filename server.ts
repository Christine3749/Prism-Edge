import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  MARKET_SYMBOLS,
  inferMarketSymbolFromInput,
  resolveMarketSymbol,
  searchMarketSymbols
} from "./packages/shared/src/marketCatalog";
import type { MarketSymbol } from "./packages/shared/src/types";

dotenv.config();
dotenv.config({ path: ".env.local" });

const app = express();
app.use(express.json({ limit: "8mb" }));

const PORT = Number(process.env.PORT || 3000);
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";
const API_CACHE_CONTROL = "no-store, max-age=0";
const HTML_CACHE_CONTROL = "no-cache, max-age=0, must-revalidate";
const STATIC_ASSET_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=86400";

type Trend = "bullish" | "bearish" | "neutral";
type SignalType = "buy" | "sell" | "watch";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AnalysisBody {
  symbol?: string;
  interval?: string;
  timeframe?: string;
  candles?: Candle[];
  indicators?: unknown;
}

interface MarketQuotePayload {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  source: string;
  updatedAt: number;
  isLive: boolean;
}

interface YahooChartPayload {
  candles: Candle[];
  source: string;
  quote?: MarketQuotePayload;
}

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

type CoinbaseCandle = [number, number, number, number, number, number];

const BINANCE_ENDPOINTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com"
];

const marketCache = new Map<string, { expiresAt: number; payload: unknown }>();
const marketRefreshInFlight = new Map<string, Promise<void>>();
const MARKET_SYMBOL_RE = /^[A-Z0-9.^=\-/]{1,36}$/;
const QUOTE_CACHE_TTL_MS = 6000;
const QUOTE_FAST_WAIT_MS = 900;
const MAX_QUOTE_SYMBOLS = 80;

const FALLBACK_QUOTES: Record<string, Omit<MarketQuotePayload, "source" | "updatedAt" | "isLive">> = Object.fromEntries(
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

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", API_CACHE_CONTROL);
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundPrice(value: number, candles: Candle[]) {
  const sample = candles.find((candle) => Number.isFinite(candle.close));
  const decimalHint = sample ? String(sample.close).split(".")[1]?.length || 2 : 2;
  const decimals = clamp(decimalHint, 2, 8);
  return Number(value.toFixed(decimals));
}

function toBinanceInterval(timeframe: string | undefined) {
  const tf = (timeframe || "1D").trim();
  if (tf.endsWith("M")) return "1M";

  const normalized = tf.toLowerCase();
  const supported = new Set(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w"]);
  return supported.has(normalized) ? normalized : "1d";
}

function toCoinbaseGranularity(interval: string) {
  switch (interval) {
    case "1m": return 60;
    case "5m": return 300;
    case "15m": return 900;
    case "1h": return 3600;
    case "4h": return 21600;
    case "1d": return 86400;
    case "1w": return 86400;
    case "1M": return 86400;
    default: return 86400;
  }
}

function toCoinbaseProductId(symbol: string) {
  const quotes = ["USDT", "USDC", "USD", "EUR", "BTC", "ETH"];
  const quote = quotes.find((candidate) => symbol.endsWith(candidate));
  if (!quote) return symbol;
  const base = symbol.slice(0, -quote.length);
  return `${base}-${quote}`;
}

function normalizeMarketSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\s+/g, "");
}

function isCryptoMarketSymbol(symbol: string) {
  const profile = resolveMarketSymbol(symbol);
  if (profile) return profile.type === "crypto";
  return /^[A-Z0-9]{3,16}USDT$/.test(symbol);
}

function toYahooSymbol(symbol: string) {
  const profile = resolveMarketSymbol(symbol) || inferMarketSymbolFromInput(symbol);
  if (profile?.yahooSymbol) return profile.yahooSymbol;

  const normalized = normalizeMarketSymbol(symbol).replace("/", "");
  if (/^[A-Z]{6}$/.test(normalized) && !normalized.endsWith("USDT")) {
    return `${normalized}=X`;
  }
  return normalized;
}

function toYahooInterval(interval: string) {
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

function toYahooRange(interval: string, limit: number) {
  if (interval === "1m") return "1d";
  if (["3m", "5m", "15m", "30m"].includes(interval)) return "5d";
  if (["1h", "2h", "4h"].includes(interval)) return "3mo";
  if (interval === "1w") return limit > 260 ? "10y" : "5y";
  if (interval === "1M") return "max";
  return limit > 260 ? "5y" : "1y";
}

function decimalPrecisionFor(symbol: string, price: number) {
  const profile = resolveMarketSymbol(symbol) || inferMarketSymbolFromInput(symbol);
  if (profile) return profile.precision;
  if (price < 5) return 5;
  return 2;
}

function toStrictNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function removeOutlierCandles(candles: Candle[]) {
  if (candles.length < 10) return candles;

  const closes = candles
    .map((candle) => candle.close)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (closes.length === 0) return candles;
  const median = closes[Math.floor(closes.length / 2)];
  if (!Number.isFinite(median) || median <= 0) return candles;

  return candles.filter((candle) => {
    const minPrice = Math.min(candle.open, candle.high, candle.low, candle.close);
    const maxPrice = Math.max(candle.open, candle.high, candle.low, candle.close);
    return minPrice > median * 0.2 && maxPrice < median * 5;
  });
}

function parseYahooCandles(result: any, limit: number): Candle[] {
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const candles = timestamps.flatMap((time: unknown, index: number) => {
    const candleTime = toStrictNumber(time);
    const open = toStrictNumber(opens[index]);
    const high = toStrictNumber(highs[index]);
    const low = toStrictNumber(lows[index]);
    const close = toStrictNumber(closes[index]);
    const volume = toStrictNumber(volumes[index]) || 0;

    if (
      candleTime === null ||
      open === null ||
      high === null ||
      low === null ||
      close === null ||
      open <= 0 ||
      high <= 0 ||
      low <= 0 ||
      close <= 0 ||
      low > high
    ) {
      return [];
    }

    return [{
      time: candleTime,
      open,
      high,
      low,
      close,
      volume
    }];
  });

  return removeOutlierCandles(candles).slice(-limit);
}

function parseLimit(rawLimit: unknown) {
  const parsed = Number(rawLimit || 200);
  if (!Number.isFinite(parsed)) return 200;
  return clamp(Math.floor(parsed), 1, 500);
}

function parseBinanceKlines(data: unknown): Candle[] {
  if (!Array.isArray(data)) {
    throw new Error("Binance kline response was not an array.");
  }

  return (data as BinanceKline[]).map((item) => ({
    time: Math.round(Number(item[0]) / 1000),
    open: Number(item[1]),
    high: Number(item[2]),
    low: Number(item[3]),
    close: Number(item[4]),
    volume: Number(item[5])
  })).filter((candle) => (
    Number.isFinite(candle.time) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close)
  ));
}

async function fetchBinanceKlines(symbol: string, interval: string, limit: number) {
  const errors: string[] = [];

  for (const baseUrl of BINANCE_ENDPOINTS) {
    const url = `${baseUrl}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
      const text = await response.text();

      if (!response.ok) {
        errors.push(`${baseUrl}: ${response.status} ${text.slice(0, 140)}`);
        continue;
      }

      return parseBinanceKlines(JSON.parse(text));
    } catch (error: any) {
      errors.push(`${baseUrl}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(" | ") || "All Binance endpoints failed.");
}

async function fetchBinanceQuote(symbol: string): Promise<MarketQuotePayload> {
  const errors: string[] = [];

  for (const baseUrl of BINANCE_ENDPOINTS) {
    const url = `${baseUrl}/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
      const text = await response.text();

      if (!response.ok) {
        errors.push(`${baseUrl}: ${response.status} ${text.slice(0, 120)}`);
        continue;
      }

      const data = JSON.parse(text);
      const price = Number(data.lastPrice);
      const change24h = Number(data.priceChangePercent);
      const volume24h = Number(data.quoteVolume || data.volume);

      if (![price, change24h, volume24h].every(Number.isFinite)) {
        throw new Error("Binance quote response missing numeric fields.");
      }

      return {
        symbol,
        price,
        change24h,
        volume24h,
        source: "binance",
        updatedAt: Date.now(),
        isLive: true
      };
    } catch (error: any) {
      errors.push(`${baseUrl}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(" | ") || "All Binance quote endpoints failed.");
}

async function fetchCoinbaseKlines(symbol: string, interval: string, limit: number) {
  const productId = toCoinbaseProductId(symbol);
  const granularity = toCoinbaseGranularity(interval);
  const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(productId)}/candles?granularity=${granularity}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Prism-Edge market data gateway" },
    signal: AbortSignal.timeout(4500)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Coinbase ${productId}: ${response.status} ${text.slice(0, 140)}`);
  }

  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error(`Coinbase ${productId}: candle response was not an array.`);
  }

  return (data as CoinbaseCandle[])
    .map((item) => ({
      time: Number(item[0]),
      open: Number(item[3]),
      high: Number(item[2]),
      low: Number(item[1]),
      close: Number(item[4]),
      volume: Number(item[5])
    }))
    .filter((candle) => (
      Number.isFinite(candle.time) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ))
    .sort((a, b) => a.time - b.time)
    .slice(-limit);
}

async function fetchYahooChart(symbol: string, interval: string, limit: number): Promise<YahooChartPayload> {
  const yahooSymbol = toYahooSymbol(symbol);
  const yahooInterval = toYahooInterval(interval);
  const range = toYahooRange(interval, limit);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${encodeURIComponent(yahooInterval)}&range=${encodeURIComponent(range)}&includePrePost=false&events=div%2Csplits`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Prism-Edge market data gateway"
    },
    signal: AbortSignal.timeout(4200)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Yahoo ${yahooSymbol}: ${response.status} ${text.slice(0, 140)}`);
  }

  const data = JSON.parse(text);
  const chartError = data?.chart?.error;
  if (chartError) {
    throw new Error(`Yahoo ${yahooSymbol}: ${chartError.description || chartError.code || "chart error"}`);
  }

  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`Yahoo ${yahooSymbol}: empty chart response.`);
  }

  const candles = parseYahooCandles(result, limit);
  if (candles.length === 0) {
    throw new Error(`Yahoo ${yahooSymbol}: no candle rows.`);
  }

  const meta = result.meta || {};
  const last = candles[candles.length - 1];
  const price = Number(meta.regularMarketPrice ?? last.close);
  const previousCandle = candles.length > 1 ? candles[candles.length - 2] : undefined;
  const previousClose = Number(meta.previousClose ?? previousCandle?.close ?? meta.chartPreviousClose);
  const rawVolume = Number(meta.regularMarketVolume ?? last.volume ?? 0);
  const precision = decimalPrecisionFor(symbol, price);
  const change24h = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;

  return {
    candles,
    source: "yahoo-delayed",
    quote: {
      symbol,
      price: Number(price.toFixed(precision)),
      change24h: Number(change24h.toFixed(2)),
      volume24h: Number.isFinite(rawVolume) ? rawVolume : 0,
      source: "yahoo-delayed",
      updatedAt: Date.now(),
      isLive: false
    }
  };
}

async function fetchYahooQuote(symbol: string): Promise<MarketQuotePayload> {
  const result = await fetchYahooChart(symbol, "1d", 5);
  if (!result.quote) {
    throw new Error(`Yahoo ${symbol}: quote missing from chart payload.`);
  }
  return result.quote;
}

async function fetchYahooQuoteBatch(symbols: string[]): Promise<Map<string, MarketQuotePayload>> {
  const normalizedSymbols = Array.from(new Set(symbols.map(normalizeMarketSymbol))).filter(Boolean);
  if (normalizedSymbols.length === 0) return new Map();

  const yahooSymbols = normalizedSymbols.map(toYahooSymbol);
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbols.join(","))}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Prism-Edge market quote gateway"
    },
    signal: AbortSignal.timeout(normalizedSymbols.length > 16 ? 6000 : 4500)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Yahoo quote batch: ${response.status} ${text.slice(0, 140)}`);
  }

  const data = JSON.parse(text);
  const rows = Array.isArray(data?.quoteResponse?.result) ? data.quoteResponse.result : [];
  const rowsByYahooSymbol = new Map<string, any>(
    rows.map((row: any) => [String(row?.symbol || "").toUpperCase(), row])
  );
  const now = Date.now();
  const quotes = new Map<string, MarketQuotePayload>();

  normalizedSymbols.forEach((symbol) => {
    const yahooSymbol = toYahooSymbol(symbol).toUpperCase();
    const row = rowsByYahooSymbol.get(yahooSymbol) || rowsByYahooSymbol.get(symbol);
    if (!row) return;

    const price = Number(row.regularMarketPrice ?? row.postMarketPrice ?? row.preMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return;

    const change24h = Number(row.regularMarketChangePercent ?? 0);
    const volume24h = Number(row.regularMarketVolume ?? row.volume ?? 0);
    const precision = decimalPrecisionFor(symbol, price);

    quotes.set(symbol, {
      symbol,
      price: Number(price.toFixed(precision)),
      change24h: Number((Number.isFinite(change24h) ? change24h : 0).toFixed(2)),
      volume24h: Number.isFinite(volume24h) ? volume24h : 0,
      source: "yahoo-delayed",
      updatedAt: now,
      isLive: false
    });
  });

  return quotes;
}

function mapYahooSearchQuote(quote: any): MarketSymbol | null {
  const rawSymbol = String(quote?.symbol || "").trim().toUpperCase();
  if (!rawSymbol || !MARKET_SYMBOL_RE.test(rawSymbol)) return null;

  const known = resolveMarketSymbol(rawSymbol);
  if (known) return known;

  const inferred = inferMarketSymbolFromInput(rawSymbol);
  const quoteType = String(quote?.quoteType || "").toUpperCase();
  const exchange = String(quote?.exchange || inferred?.exchange || quote?.exchDisp || "Yahoo");
  const name = String(quote?.longname || quote?.shortname || quote?.name || inferred?.name || `${rawSymbol} Market Instrument`);
  const type = quoteType === "CURRENCY" ? "forex" : quoteType === "CRYPTOCURRENCY" ? "crypto" : "stock";
  const market: MarketSymbol["market"] = inferred?.market || (rawSymbol.endsWith(".HK") ? "hk" : rawSymbol.endsWith(".SZ") || rawSymbol.endsWith(".SS") ? "cn" : type === "forex" ? "forex" : type === "crypto" ? "crypto" : "us");

  return {
    id: inferred?.id || rawSymbol,
    symbol: inferred?.symbol || rawSymbol,
    name,
    type,
    market,
    exchange,
    currency: inferred?.currency || String(quote?.currency || (market === "hk" ? "HKD" : market === "cn" ? "CNY" : "USD")),
    dataProvider: "yahoo",
    yahooSymbol: inferred?.yahooSymbol || rawSymbol,
    price: Number(quote?.regularMarketPrice || inferred?.price || 0),
    change24h: Number(quote?.regularMarketChangePercent || 0),
    volume24h: Number(quote?.regularMarketVolume || 0),
    precision: inferred?.precision || (type === "forex" ? 5 : 2)
  };
}

async function fetchYahooSearch(query: string, limit: number): Promise<MarketSymbol[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0&listsCount=0&enableFuzzyQuery=true`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Prism-Edge market search gateway"
    },
    signal: AbortSignal.timeout(5000)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Yahoo search: ${response.status} ${text.slice(0, 140)}`);
  }

  const data = JSON.parse(text);
  return (Array.isArray(data?.quotes) ? data.quotes : [])
    .map(mapYahooSearchQuote)
    .filter(Boolean)
    .slice(0, limit) as MarketSymbol[];
}

async function fetchMarketKlines(symbol: string, interval: string, limit: number) {
  const errors: string[] = [];
  const cryptoSymbol = isCryptoMarketSymbol(symbol);

  if (cryptoSymbol) {
    try {
      const candles = await fetchBinanceKlines(symbol, interval, limit);
      return { candles, source: "binance" };
    } catch (error: any) {
      errors.push(`binance: ${error?.message || String(error)}`);
    }

    try {
      const candles = await fetchCoinbaseKlines(symbol, interval, limit);
      return { candles, source: "coinbase" };
    } catch (error: any) {
      errors.push(`coinbase: ${error?.message || String(error)}`);
    }
  }

  try {
    const payload = await fetchYahooChart(symbol, interval, limit);
    return { candles: payload.candles, source: payload.source };
  } catch (error: any) {
    errors.push(`yahoo: ${error?.message || String(error)}`);
  }

  throw new Error(errors.join(" | "));
}

async function fetchMarketQuote(symbol: string): Promise<MarketQuotePayload> {
  const errors: string[] = [];
  let yahooAttempted = false;

  if (isCryptoMarketSymbol(symbol)) {
    try {
      return await fetchBinanceQuote(symbol);
    } catch (error: any) {
      errors.push(`binance: ${error?.message || String(error)}`);
    }
  } else {
    try {
      yahooAttempted = true;
      return await fetchYahooQuote(symbol);
    } catch (error: any) {
      errors.push(`yahoo: ${error?.message || String(error)}`);
    }
  }

  try {
    if (yahooAttempted) throw new Error("Yahoo already attempted.");
    return await fetchYahooQuote(symbol);
  } catch (error: any) {
    if (!yahooAttempted) errors.push(`yahoo: ${error?.message || String(error)}`);
    const fallback = FALLBACK_QUOTES[symbol];
    if (!fallback) {
      const inferred = inferMarketSymbolFromInput(symbol);
      if (!inferred) throw new Error(errors.join(" | "));

      return {
        symbol: inferred.symbol,
        price: inferred.price,
        change24h: inferred.change24h,
        volume24h: inferred.volume24h,
        source: "simulated",
        updatedAt: Date.now(),
        isLive: false
      };
    }

    const noise = 1 + (Math.random() - 0.5) * 0.002;
    return {
      ...fallback,
      price: Number((fallback.price * noise).toFixed(symbol.includes("USD") && !symbol.endsWith("USDT") ? 5 : 4)),
      source: "simulated",
      updatedAt: Date.now(),
      isLive: false
    };
  }
}

function buildFallbackQuote(symbol: string): MarketQuotePayload {
  const fallback = FALLBACK_QUOTES[symbol];
  if (fallback) {
    const noise = 1 + (Math.random() - 0.5) * 0.0015;
    const precision = decimalPrecisionFor(symbol, fallback.price);
    return {
      ...fallback,
      price: Number((fallback.price * noise).toFixed(precision)),
      source: "simulated",
      updatedAt: Date.now(),
      isLive: false
    };
  }

  const inferred = inferMarketSymbolFromInput(symbol);
  if (inferred) {
    return {
      symbol: inferred.symbol,
      price: inferred.price,
      change24h: inferred.change24h,
      volume24h: inferred.volume24h,
      source: "simulated",
      updatedAt: Date.now(),
      isLive: false
    };
  }

  return {
    symbol,
    price: 0,
    change24h: 0,
    volume24h: 0,
    source: "simulated",
    updatedAt: Date.now(),
    isLive: false
  };
}

function buildFallbackQuotePayload(symbols: string[]) {
  return {
    quotes: symbols.map(buildFallbackQuote),
    updatedAt: Date.now(),
    fallback: true
  };
}

async function fetchMarketQuotePayload(symbols: string[]) {
  const yahooSymbols = symbols.filter((symbol) => !isCryptoMarketSymbol(symbol));
  const yahooBatchQuotes = yahooSymbols.length > 1
    ? await fetchYahooQuoteBatch(yahooSymbols).catch((error) => {
      console.warn("Yahoo batch quote failed, falling back to per-symbol quotes.", error);
      return new Map<string, MarketQuotePayload>();
    })
    : new Map<string, MarketQuotePayload>();

  const quotes = await Promise.all(symbols.map(async (symbol) => {
    const batchQuote = yahooBatchQuotes.get(symbol);
    if (batchQuote) return batchQuote;

    try {
      return await fetchMarketQuote(symbol);
    } catch (error) {
      console.warn(`Quote gateway failed for ${symbol}.`, error);
      return buildFallbackQuote(symbol);
    }
  }));

  return {
    quotes,
    updatedAt: Date.now()
  };
}

function refreshQuoteCache(cacheKey: string, symbols: string[]) {
  const existing = marketRefreshInFlight.get(cacheKey);
  if (existing) return existing;

  const refresh = fetchMarketQuotePayload(symbols)
    .then((payload) => {
      marketCache.set(cacheKey, {
        expiresAt: Date.now() + QUOTE_CACHE_TTL_MS,
        payload
      });
    })
    .catch((error) => {
      console.warn(`Background quote refresh failed for ${cacheKey}.`, error);
    })
    .finally(() => {
      marketRefreshInFlight.delete(cacheKey);
    });

  marketRefreshInFlight.set(cacheKey, refresh);
  return refresh;
}

function computeLocalAnalysis(body: AnalysisBody) {
  const symbol = body.symbol || "UNKNOWN";
  const interval = body.interval || body.timeframe || "1D";
  const candles = Array.isArray(body.candles) ? body.candles.filter((candle) => Number.isFinite(candle.close)) : [];

  if (candles.length === 0) {
    throw new Error("Missing candles dataset.");
  }

  const recent = candles.slice(-40);
  const last = recent[recent.length - 1];
  const first = recent[0];
  const closes = recent.map((candle) => candle.close);
  const highs = recent.map((candle) => candle.high);
  const lows = recent.map((candle) => candle.low);

  const smaFast = average(closes.slice(-8));
  const smaSlow = average(closes.slice(-24));
  const momentum = first.close !== 0 ? (last.close - first.close) / first.close : 0;
  const maSpread = smaSlow !== 0 ? (smaFast - smaSlow) / smaSlow : 0;

  let trend: Trend = "neutral";
  if (momentum > 0.002 && maSpread >= -0.001) trend = "bullish";
  if (momentum < -0.002 && maSpread <= 0.001) trend = "bearish";

  const confidence = clamp(0.55 + Math.abs(momentum) * 8 + Math.abs(maSpread) * 6, 0.55, 0.92);
  const signalType: SignalType = trend === "bullish" ? "buy" : trend === "bearish" ? "sell" : "watch";
  const signalLabel = trend === "bullish"
    ? "Momentum Breakout"
    : trend === "bearish"
      ? "Risk-Off Reversal"
      : "Range Compression Watch";

  const supportPrimary = Math.min(...lows.slice(-20));
  const supportSecondary = Math.min(...lows);
  const resistancePrimary = Math.max(...highs.slice(-20));
  const resistanceSecondary = Math.max(...highs);
  const support = Array.from(new Set([supportPrimary, supportSecondary].map((value) => roundPrice(value, recent))));
  const resistance = Array.from(new Set([resistancePrimary, resistanceSecondary].map((value) => roundPrice(value, recent))));

  const trendText = trend === "bullish" ? "偏多" : trend === "bearish" ? "偏空" : "中性震荡";
  const summary = `${symbol} ${interval} 当前结构${trendText}，最近窗口动量为 ${(momentum * 100).toFixed(2)}%，快慢均线差为 ${(maSpread * 100).toFixed(2)}%。短线先观察 ${resistance[0]} 压力与 ${support[0]} 支撑的有效性，等待突破或回踩确认后再提高策略权重。`;

  return {
    trend,
    confidence: Number(confidence.toFixed(2)),
    signals: [
      {
        type: signalType,
        time: last.time,
        price: roundPrice(last.close, recent),
        label: signalLabel,
        confidence: Number(confidence.toFixed(2))
      }
    ],
    levels: {
      support,
      resistance
    },
    summary,
    meta: {
      engine: "node-offline-fallback",
      generatedAt: new Date().toISOString(),
      candleCount: candles.length
    },
    serviceFallback: true
  };
}

app.get("/api/health", async (_req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(1500) });
    const payload = await response.json();
    return res.status(response.status).json(payload);
  } catch {
    return res.json({
      status: "degraded",
      web: "ok",
      apiBaseUrl: API_BASE_URL,
      message: "FastAPI service is not reachable; Node fallback is active."
    });
  }
});

app.get("/api/market/klines", async (req, res) => {
  const symbol = normalizeMarketSymbol(String(req.query.symbol || ""));
  const interval = toBinanceInterval(String(req.query.interval || req.query.timeframe || "1D"));
  const limit = parseLimit(req.query.limit);

  if (!MARKET_SYMBOL_RE.test(symbol)) {
    return res.status(400).json({ error: "Invalid market symbol." });
  }

  const cacheKey = `${symbol}:${interval}:${limit}`;
  const cached = marketCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.payload);
  }

  try {
    const { candles, source } = await fetchMarketKlines(symbol, interval, limit);
    if (candles.length === 0) {
      return res.status(502).json({ error: "No candle data returned by market source." });
    }

    const payload = {
      symbol,
      interval,
      source,
      candles
    };

    marketCache.set(cacheKey, {
      expiresAt: Date.now() + (limit <= 2 ? 1000 : 30000),
      payload
    });

    return res.json(payload);
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

  if (symbols.length === 0 || symbols.some((symbol) => !MARKET_SYMBOL_RE.test(symbol))) {
    return res.status(400).json({ error: "Invalid market symbol list." });
  }

  const cacheKey = `quote:${[...symbols].sort().join(",")}`;
  const cached = marketCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.payload);
  }

  if (cached) {
    refreshQuoteCache(cacheKey, symbols);
    return res.json(cached.payload);
  }

  const quotePayloadPromise = fetchMarketQuotePayload(symbols);
  const payload = await Promise.race([
    quotePayloadPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), QUOTE_FAST_WAIT_MS))
  ]);

  if (!payload) {
    if (!marketRefreshInFlight.has(cacheKey)) {
      const refresh = quotePayloadPromise
        .then((nextPayload) => {
          marketCache.set(cacheKey, {
            expiresAt: Date.now() + QUOTE_CACHE_TTL_MS,
            payload: nextPayload
          });
        })
        .catch((error) => {
          console.warn(`Background quote refresh failed for ${cacheKey}.`, error);
        })
        .finally(() => {
          marketRefreshInFlight.delete(cacheKey);
        });

      marketRefreshInFlight.set(cacheKey, refresh);
    }

    return res.json(buildFallbackQuotePayload(symbols));
  }

  marketCache.set(cacheKey, {
    expiresAt: Date.now() + QUOTE_CACHE_TTL_MS,
    payload
  });

  return res.json(payload);
});

app.get("/api/market/search", async (req, res) => {
  const query = String(req.query.q || req.query.query || "").trim();
  const market = String(req.query.market || "all").trim().toLowerCase();
  const rawLimit = Number(req.query.limit || 30);
  const limit = Number.isFinite(rawLimit) ? clamp(rawLimit, 1, 80) : 30;

  const localResults = searchMarketSymbols(query, market, Math.ceil(limit / 2));
  const merged = new Map<string, MarketSymbol>();
  localResults.forEach((symbol) => merged.set(symbol.symbol, symbol));

  if (query.length >= 2) {
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
  const upstreamUrl = `${API_BASE_URL}/api/analysis/run`;

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

app.get("/api/news", (req, res) => {
  const { symbol } = req.query;
  const asset = (symbol as string) || "Crypto/Global";

  const newsItems = [
    {
      id: "1",
      title: `${asset} Displays Substantial Order Block Consolidation Near Key Support`,
      source: "Prism Market Pulse",
      time: "12m ago",
      sentiment: "neutral",
      summary: "Consensus remains split as whale wallets absorb spot order distribution, building high-density clusters.",
      url: "#"
    },
    {
      id: "2",
      title: "Liquidity Volatilities Surge in Options Spreads Across Prime Market Pairs",
      source: "Chronicle Institutional",
      time: "48m ago",
      sentiment: "bullish",
      summary: "Implied volatility premiums compress as market participants buy leverage-backed calls for upside breakout configurations.",
      url: "#"
    },
    {
      id: "3",
      title: "Regulatory Framework Revisions Prompt Capital Allocations Shifting",
      source: "Apex Capital Research",
      time: "2h ago",
      sentiment: "bullish",
      summary: "New policy proposals support compliance-ready custody products, triggering institutional fiat inflows.",
      url: "#"
    },
    {
      id: "4",
      title: "Global Macro Indicators Hint at Shift in Yield Curve Pressures",
      source: "Prism Global",
      time: "4h ago",
      sentiment: "neutral",
      summary: "Central banks monitor core retail sales indexes for adjustments to upcoming borrowing guidelines.",
      url: "#"
    },
    {
      id: "5",
      title: "Automated Liquidation Sweeps Trigger Squeeze Across Leveraged Shorts",
      source: "Derivatives Daily",
      time: "6h ago",
      sentiment: "bullish",
      summary: "Unwinding futures margins spike buying pressures on short stops, cleaning the immediate supply grid.",
      url: "#"
    }
  ];

  res.json({ news: newsItems });
});

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Prism-Edge web server in development mode with Vite middleware...");
    const vite = await createViteServer({
      configFile: path.join(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production bundle from dist folder...");
    const distPath = path.join(process.cwd(), "dist");

    app.use("/assets", express.static(path.join(distPath, "assets"), {
      maxAge: "5m",
      setHeaders: (res) => {
        res.setHeader("Cache-Control", STATIC_ASSET_CACHE_CONTROL);
      }
    }));

    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
      }
    }));

    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Prism-Edge web application running at http://localhost:${PORT}`);
    console.log(`Analysis API gateway target: ${API_BASE_URL}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failure bootstrapping Prism-Edge web server:", err);
});
