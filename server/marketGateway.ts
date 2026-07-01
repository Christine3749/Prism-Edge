import { inferMarketSymbolFromInput } from "../packages/shared/src/marketCatalog";
import { generateSimulatedHistoricalKlines } from "../packages/shared/src/mockMarketData";
import type { MarketSymbol } from "../packages/shared/src/types";
import {
  FALLBACK_QUOTES,
  QUOTE_CACHE_TTL_MS,
  QUOTE_FAST_WAIT_MS
} from "./config";
import { decimalPrecisionFor, isCryptoMarketSymbol } from "./marketFormat";
import {
  fetchAlphaVantageChart,
  fetchAlphaVantageQuote,
  fetchBinanceKlines,
  fetchBinanceQuote,
  fetchCoinbaseKlines,
  fetchCoinbaseQuote,
  fetchFinnhubChart,
  fetchFinnhubQuote,
  fetchPolygonChart,
  fetchPolygonQuote,
  fetchTwelveDataChart,
  fetchTwelveDataQuote,
  fetchYahooChart,
  fetchYahooQuote,
  fetchYahooQuoteBatch,
  hasConfiguredPremiumProvider,
  isAlphaVantageConfigured,
  isFinnhubConfigured,
  isPolygonConfigured,
  isTwelveDataConfigured
} from "./marketProviders";
import type { Candle, KlinePayload, MarketQuotePayload, QuotePayload, YahooChartPayload } from "./types";

const marketCache = new Map<string, { expiresAt: number; payload: unknown }>();
const marketRefreshInFlight = new Map<string, Promise<void>>();

type RouteAttempt<T> = {
  label: string;
  enabled: boolean;
  run: () => Promise<T>;
};

type KlineRouteResult = {
  candles: Candle[];
  source: string;
  isLive: boolean;
  route: string[];
  errors: string[];
};

async function runProviderRoute<T extends { source: string }>(attempts: RouteAttempt<T>[]) {
  const route: string[] = [];
  const errors: string[] = [];

  for (const attempt of attempts) {
    if (!attempt.enabled) continue;
    route.push(attempt.label);
    try {
      const payload = await attempt.run();
      return { ...payload, route: [...route], errors };
    } catch (error: any) {
      errors.push(`${attempt.label}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(" | ") || "No enabled market data provider returned a payload.");
}

function chartToKlineResult(payload: YahooChartPayload, isLive = false) {
  return {
    candles: payload.candles,
    source: payload.source,
    isLive
  };
}

function minimumKlineRows(interval: string, limit: number) {
  if (limit <= 2) return 1;
  const normalized = interval.toLowerCase();
  if (normalized === "1m") {
    return Math.min(18, Math.max(8, Math.floor(limit * 0.08)));
  }
  if (normalized === "1w" || interval === "1M") {
    return Math.min(40, Math.max(12, Math.floor(limit * 0.2)));
  }
  return Math.min(60, Math.max(24, Math.floor(limit * 0.15)));
}

function requireUsefulKlines<T extends Omit<KlineRouteResult, "route" | "errors">>(
  result: T,
  interval: string,
  limit: number,
  provider: string
) {
  const minimum = minimumKlineRows(interval, limit);
  if (result.candles.length < minimum) {
    throw new Error(`${provider} returned only ${result.candles.length} candle rows; expected at least ${minimum}.`);
  }
  return result;
}

function intervalSeconds(interval: string) {
  switch (interval.toLowerCase()) {
    case "1m": return 60;
    case "3m": return 180;
    case "5m": return 300;
    case "15m": return 900;
    case "30m": return 1800;
    case "1h": return 3600;
    case "2h": return 7200;
    case "4h": return 14400;
    case "6h": return 21600;
    case "8h": return 28800;
    case "12h": return 43200;
    case "1d": return 86400;
    default: return null;
  }
}

function medianCandleStepSeconds(candles: Candle[]) {
  const diffs: number[] = [];
  const ordered = [...candles].sort((a, b) => a.time - b.time);
  for (let index = 1; index < ordered.length; index += 1) {
    const diff = ordered[index].time - ordered[index - 1].time;
    if (Number.isFinite(diff) && diff > 0) diffs.push(diff);
  }
  if (diffs.length === 0) return null;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

function normalizeCandlesForInterval(candles: Candle[], interval: string, limit: number) {
  const targetSeconds = intervalSeconds(interval);
  if (!targetSeconds || candles.length < 2) return candles.slice(-limit);

  const sourceStep = medianCandleStepSeconds(candles);
  if (!sourceStep || sourceStep > targetSeconds * 1.25) return candles.slice(-limit);

  const ordered = [...candles].sort((a, b) => a.time - b.time);
  const buckets = new Map<number, Candle[]>();
  ordered.forEach((candle) => {
    const bucketStart = Math.floor(candle.time / targetSeconds) * targetSeconds;
    const bucket = buckets.get(bucketStart) || [];
    bucket.push(candle);
    buckets.set(bucketStart, bucket);
  });

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left - right)
    .map(([time, bucket]) => {
      const first = bucket[0];
      const last = bucket[bucket.length - 1];
      return {
        time,
        open: first.open,
        high: Math.max(...bucket.map((candle) => candle.high)),
        low: Math.min(...bucket.map((candle) => candle.low)),
        close: last.close,
        volume: bucket.reduce((sum, candle) => sum + (Number.isFinite(candle.volume) ? candle.volume : 0), 0)
      };
    })
    .slice(-limit);
}

function buildKlineAttempts(symbol: string, interval: string, limit: number): RouteAttempt<Omit<KlineRouteResult, "route" | "errors">>[] {
  const externalAttempts: RouteAttempt<Omit<KlineRouteResult, "route" | "errors">>[] = [
    {
      label: "polygon",
      enabled: isPolygonConfigured(),
      run: async () => requireUsefulKlines(chartToKlineResult(await fetchPolygonChart(symbol, interval, limit), false), interval, limit, "Polygon")
    },
    {
      label: "twelve-data",
      enabled: isTwelveDataConfigured(),
      run: async () => requireUsefulKlines(chartToKlineResult(await fetchTwelveDataChart(symbol, interval, limit), false), interval, limit, "Twelve Data")
    },
    {
      label: "finnhub",
      enabled: isFinnhubConfigured(),
      run: async () => requireUsefulKlines(chartToKlineResult(await fetchFinnhubChart(symbol, interval, limit), false), interval, limit, "Finnhub")
    },
    {
      label: "alpha-vantage",
      enabled: isAlphaVantageConfigured(),
      run: async () => requireUsefulKlines(chartToKlineResult(await fetchAlphaVantageChart(symbol, interval, limit), false), interval, limit, "Alpha Vantage")
    },
    {
      label: "yahoo-delayed",
      enabled: true,
      run: async () => requireUsefulKlines(chartToKlineResult(await fetchYahooChart(symbol, interval, limit), false), interval, limit, "Yahoo")
    }
  ];

  if (!isCryptoMarketSymbol(symbol)) return externalAttempts;

  return [
    {
      label: "binance",
      enabled: true,
      run: async () => requireUsefulKlines({ candles: await fetchBinanceKlines(symbol, interval, limit), source: "binance", isLive: true }, interval, limit, "Binance")
    },
    {
      label: "coinbase",
      enabled: true,
      run: async () => requireUsefulKlines({ candles: await fetchCoinbaseKlines(symbol, interval, limit), source: "coinbase", isLive: true }, interval, limit, "Coinbase")
    },
    ...externalAttempts
  ];
}

function buildQuoteAttempts(symbol: string): RouteAttempt<MarketQuotePayload>[] {
  const externalAttempts: RouteAttempt<MarketQuotePayload>[] = [
    { label: "polygon", enabled: isPolygonConfigured(), run: () => fetchPolygonQuote(symbol) },
    { label: "twelve-data", enabled: isTwelveDataConfigured(), run: () => fetchTwelveDataQuote(symbol) },
    { label: "finnhub", enabled: isFinnhubConfigured(), run: () => fetchFinnhubQuote(symbol) },
    { label: "alpha-vantage", enabled: isAlphaVantageConfigured(), run: () => fetchAlphaVantageQuote(symbol) },
    { label: "yahoo-delayed", enabled: true, run: () => fetchYahooQuote(symbol) }
  ];

  if (!isCryptoMarketSymbol(symbol)) return externalAttempts;

  return [
    { label: "binance", enabled: true, run: () => fetchBinanceQuote(symbol) },
    { label: "coinbase", enabled: true, run: () => fetchCoinbaseQuote(symbol) },
    ...externalAttempts
  ];
}

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


