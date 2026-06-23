import { inferMarketSymbolFromInput } from "../packages/shared/src/marketCatalog";
import {
  FALLBACK_QUOTES,
  QUOTE_CACHE_TTL_MS,
  QUOTE_FAST_WAIT_MS
} from "./config";
import { decimalPrecisionFor, isCryptoMarketSymbol } from "./marketFormat";
import {
  fetchBinanceKlines,
  fetchBinanceQuote,
  fetchCoinbaseKlines,
  fetchYahooChart,
  fetchYahooQuote,
  fetchYahooQuoteBatch
} from "./marketProviders";
import type { KlinePayload, MarketQuotePayload, QuotePayload } from "./types";

const marketCache = new Map<string, { expiresAt: number; payload: unknown }>();
const marketRefreshInFlight = new Map<string, Promise<void>>();

async function fetchMarketKlines(symbol: string, interval: string, limit: number) {
  const errors: string[] = [];

  if (isCryptoMarketSymbol(symbol)) {
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

    throw new Error(errors.join(" | "));
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
    return buildFallbackQuoteOrThrow(symbol, errors);
  }
}

function buildFallbackQuoteOrThrow(symbol: string, errors: string[]) {
  const fallback = FALLBACK_QUOTES[symbol];
  if (fallback) return buildFallbackQuote(symbol);

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

export function buildFallbackQuote(symbol: string): MarketQuotePayload {
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

  return { symbol, price: 0, change24h: 0, volume24h: 0, source: "simulated", updatedAt: Date.now(), isLive: false };
}

function buildFallbackQuotePayload(symbols: string[]): QuotePayload {
  return {
    quotes: symbols.map(buildFallbackQuote),
    updatedAt: Date.now(),
    fallback: true
  };
}

async function fetchMarketQuotePayload(symbols: string[]): Promise<QuotePayload> {
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

  return { quotes, updatedAt: Date.now() };
}

function refreshQuoteCache(cacheKey: string, symbols: string[]) {
  const existing = marketRefreshInFlight.get(cacheKey);
  if (existing) return existing;

  const refresh = fetchMarketQuotePayload(symbols)
    .then((payload) => {
      marketCache.set(cacheKey, { expiresAt: Date.now() + QUOTE_CACHE_TTL_MS, payload });
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

export async function getKlinePayload(symbol: string, interval: string, limit: number): Promise<KlinePayload> {
  const cacheKey = `${symbol}:${interval}:${limit}`;
  const cached = marketCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.payload as KlinePayload;

  const { candles, source } = await fetchMarketKlines(symbol, interval, limit);
  if (candles.length === 0) throw new Error("No candle data returned by market source.");

  const payload = { symbol, interval, source, candles };
  marketCache.set(cacheKey, { expiresAt: Date.now() + (limit <= 2 ? 1000 : 30000), payload });
  return payload;
}

export async function getQuotePayload(symbols: string[]): Promise<QuotePayload> {
  const cacheKey = `quote:${[...symbols].sort().join(",")}`;
  const cached = marketCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.payload as QuotePayload;

  if (cached) {
    refreshQuoteCache(cacheKey, symbols);
    return cached.payload as QuotePayload;
  }

  const quotePayloadPromise = fetchMarketQuotePayload(symbols);
  const payload = await Promise.race([
    quotePayloadPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), QUOTE_FAST_WAIT_MS))
  ]);

  if (!payload) {
    refreshQuoteCache(cacheKey, symbols);
    return buildFallbackQuotePayload(symbols);
  }

  marketCache.set(cacheKey, { expiresAt: Date.now() + QUOTE_CACHE_TTL_MS, payload });
  return payload;
}
