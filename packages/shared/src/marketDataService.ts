import { MarketSymbol, Candle, MarketQuote } from "./types";
import { generateSimulatedHistoricalKlines } from "./mockMarketData";
export type { RealtimeTick } from "./realtimeService";

export { subscribeRealtime, updateCandlesFromTick } from "./realtimeService";

interface MarketGatewayResponse {
  candles: Candle[];
  source?: string;
  updatedAt?: number;
  isLive?: boolean;
}

interface QuoteGatewayResponse {
  quotes: MarketQuote[];
  updatedAt?: number;
}

function readViteEnv(name: string) {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name] || "";
}

const MARKET_API_BASE_URL = (
  readViteEnv("VITE_MARKET_API_BASE_URL") ||
  readViteEnv("VITE_API_BASE_URL")
).replace(/\/+$/, "");

export function buildMarketApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${MARKET_API_BASE_URL}${normalizedPath}`;
}

// Warning registry to avoid spamming warnings
const warnedEndpoints = new Set<string>();

function warnOnce(key: string, message: string, ...args: any[]) {
  if (!warnedEndpoints.has(key)) {
    warnedEndpoints.add(key);
    console.warn(message, ...args);
  }
}

export async function fetchHistoricalCryptoKlines(
  binanceSymbol: string,
  timeframe: string,
  limit = 200
): Promise<Candle[]> {
  const result = await fetchHistoricalGatewayKlines(binanceSymbol, timeframe, limit);
  return result.candles;
}

export async function fetchHistoricalGatewayKlines(
  symbol: string,
  timeframe: string,
  limit = 200
): Promise<{ candles: Candle[]; source: string; updatedAt: number; isLive: boolean; latencyMs: number }> {
  const startedAt = performance.now();
  const params = new URLSearchParams({
    symbol,
    interval: timeframe,
    limit: String(limit)
  });
  const response = await fetch(buildMarketApiUrl(`/api/market/klines?${params.toString()}`), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(limit <= 2 ? 3500 : 6500)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Failed loading market klines for ${symbol}. ${detail.slice(0, 160)}`);
  }

  const data = await response.json() as MarketGatewayResponse;
  const candles = Array.isArray(data.candles) ? data.candles : [];

  return {
    source: data.source || "gateway",
    updatedAt: data.updatedAt || Date.now(),
    isLive: Boolean(data.isLive),
    latencyMs: Math.round(performance.now() - startedAt),
    candles: candles.filter((candle) => (
    Number.isFinite(candle.time) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close)
    ))
  };
}

function isLiveGatewaySource(source: string) {
  const normalized = source.toLowerCase();
  return normalized.includes("binance") || normalized.includes("coinbase");
}

export async function loadMarketData(
  symbol: MarketSymbol,
  timeframe: string
): Promise<{ candles: Candle[]; isLiveBinance: boolean; source: string; updatedAt: number; latencyMs?: number; fallbackReason?: string }> {
  try {
    try {
      const hist = await fetchHistoricalGatewayKlines(symbol.symbol, timeframe, 200);
      return {
        candles: hist.candles,
        isLiveBinance: hist.isLive || isLiveGatewaySource(hist.source),
        source: hist.source,
        updatedAt: hist.updatedAt,
        latencyMs: hist.latencyMs
      };
    } catch (err) {
      warnOnce(
        `rest_${symbol.symbol}`,
        `[Market REST gateway fallback] Failed fetching external data, spawning custom simulation curve. Error details:`,
        err
      );
      const fallback = generateSimulatedHistoricalKlines(symbol, timeframe, 200);
      const fallbackReason = err instanceof Error ? err.message : String(err);
      return {
        candles: fallback,
        isLiveBinance: false,
        source: "simulated",
        updatedAt: Date.now(),
        fallbackReason: `REST gateway failed: ${fallbackReason.slice(0, 140)}`
      };
    }
  } catch (err) {
    warnOnce("load_error_ultimate", "Ultimate market data service load exception:", err);
    const fallback = generateSimulatedHistoricalKlines(symbol, timeframe, 200);
    const fallbackReason = err instanceof Error ? err.message : String(err);
    return {
      candles: fallback,
      isLiveBinance: false,
      source: "simulated",
      updatedAt: Date.now(),
      fallbackReason: `Market service exception: ${fallbackReason.slice(0, 140)}`
    };
  }
}

export async function getHistoricalCandles(
  symbol: MarketSymbol,
  interval: string
): Promise<{ candles: Candle[]; isLiveBinance: boolean; source: string; updatedAt: number; latencyMs?: number; fallbackReason?: string }> {
  return loadMarketData(symbol, interval);
}

export async function fetchMarketQuotes(symbols: MarketSymbol[]): Promise<MarketQuote[]> {
  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.symbol))).filter(Boolean);
  if (uniqueSymbols.length === 0) return [];

  const params = new URLSearchParams({
    symbols: uniqueSymbols.join(",")
  });

  const response = await fetch(buildMarketApiUrl(`/api/market/quote?${params.toString()}`), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(uniqueSymbols.length > 24 ? 6000 : 4500)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Failed loading market quotes. ${detail.slice(0, 160)}`);
  }

  const data = await response.json() as QuoteGatewayResponse;
  const quotes = Array.isArray(data.quotes) ? data.quotes : [];

  return quotes.filter((quote) => (
    typeof quote.symbol === "string" &&
    Number.isFinite(quote.price) &&
    Number.isFinite(quote.change24h) &&
    Number.isFinite(quote.volume24h)
  ));
}

export const safeMarketDataService = {
  getHistoricalCandles,
  fetchMarketQuotes,
};
