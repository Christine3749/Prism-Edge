import { inferMarketSymbolFromInput } from "../packages/shared/src/marketCatalog";
import { generateSimulatedHistoricalKlines } from "../packages/shared/src/mockMarketData";
import type { MarketSymbol } from "../packages/shared/src/types";
import {
  FALLBACK_QUOTES,
  QUOTE_CACHE_TTL_MS,
  QUOTE_FAST_WAIT_MS
} from "./config";
import { decimalPrecisionFor, isCryptoMarketSymbol } from "./marketFormat";
import { fetchYahooQuoteBatch, hasConfiguredPremiumProvider } from "./marketProviders";
import type { KlinePayload, MarketQuotePayload, QuotePayload } from "./types";
import { buildKlineAttempts, buildQuoteAttempts, normalizeCandlesForInterval, runProviderRoute } from "./marketGatewayRoutes";
import type { KlineRouteResult } from "./marketGatewayRoutes";

const marketCache = new Map<string, { expiresAt: number; payload: unknown }>();
const marketRefreshInFlight = new Map<string, Promise<void>>();

function buildSimulatedKlineResult(symbol: string, interval: string, limit: number, errors: string[]): KlineRouteResult {
  const inferred = inferMarketSymbolFromInput(symbol);
  const fallback = FALLBACK_QUOTES[symbol];
  const price = fallback?.price ?? inferred?.price ?? 100;
  const profile: MarketSymbol = inferred ?? {
    id: symbol,
    symbol,
    name: `${symbol} simulated market`,
    type: isCryptoMarketSymbol(symbol) ? "crypto" : "stock",
    market: isCryptoMarketSymbol(symbol) ? "crypto" : "us",
    exchange: "SIM",
    currency: "USD",
    dataProvider: "simulated",
    price,
    change24h: fallback?.change24h ?? 0,
    volume24h: fallback?.volume24h ?? 0,
    precision: decimalPrecisionFor(symbol, price)
  };
  return {
    candles: generateSimulatedHistoricalKlines(profile, interval, limit),
    source: "simulated",
    isLive: false,
    route: ["simulated"],
    errors
  };
}

function canUseSimulatedKlineFallback(symbol: string) {
  const profile = inferMarketSymbolFromInput(symbol);
  return profile?.dataProvider === "simulated" || profile?.market === "internal";
}

async function fetchMarketKlines(symbol: string, interval: string, limit: number): Promise<KlineRouteResult> {
  try {
    const result = await runProviderRoute(buildKlineAttempts(symbol, interval, limit));
    if (result.candles.length === 0) throw new Error("No candle data returned by market provider route.");
    return { ...result, candles: normalizeCandlesForInterval(result.candles, interval, limit) };
  } catch (error: any) {
    if (!canUseSimulatedKlineFallback(symbol)) {
      throw new Error(`No verified candles for ${symbol} ${interval}. ${error?.message || String(error)}`);
    }
    return buildSimulatedKlineResult(symbol, interval, limit, [error?.message || String(error)]);
  }
}

async function fetchMarketQuote(symbol: string): Promise<MarketQuotePayload> {
  try {
    return await runProviderRoute(buildQuoteAttempts(symbol));
  } catch (error: any) {
    return buildFallbackQuoteOrThrow(symbol, [error?.message || String(error)]);
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
  const shouldUsePremiumRoute = hasConfiguredPremiumProvider();
  const yahooSymbols = shouldUsePremiumRoute ? [] : symbols.filter((symbol) => !isCryptoMarketSymbol(symbol));
  const yahooBatchQuotes = yahooSymbols.length > 1
    ? await fetchYahooQuoteBatch(yahooSymbols).catch((error) => {
      console.warn("Yahoo batch quote failed, falling back to provider route per symbol.", error);
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

  const { candles, source, isLive, route, errors } = await fetchMarketKlines(symbol, interval, limit);
  if (candles.length === 0) throw new Error("No candle data returned by market source.");

  const payload: KlinePayload = { symbol, interval, source, isLive, updatedAt: Date.now(), candles, route, providerErrors: errors };
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


