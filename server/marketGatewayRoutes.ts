import { isCryptoMarketSymbol } from "./marketFormat";
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
  isAlphaVantageConfigured,
  isFinnhubConfigured,
  isPolygonConfigured,
  isTwelveDataConfigured
} from "./marketProviders";
import type { Candle, MarketQuotePayload, YahooChartPayload } from "./types";

export type RouteAttempt<T> = {
  label: string;
  enabled: boolean;
  run: () => Promise<T>;
};

export type KlineRouteResult = {
  candles: Candle[];
  source: string;
  isLive: boolean;
  route: string[];
  errors: string[];
};

export async function runProviderRoute<T extends { source: string }>(attempts: RouteAttempt<T>[]) {
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

export function normalizeCandlesForInterval(candles: Candle[], interval: string, limit: number) {
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

export function buildKlineAttempts(symbol: string, interval: string, limit: number): RouteAttempt<Omit<KlineRouteResult, "route" | "errors">>[] {
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

export function buildQuoteAttempts(symbol: string): RouteAttempt<MarketQuotePayload>[] {
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
