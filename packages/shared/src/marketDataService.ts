import { MarketSymbol, Candle, MarketQuote } from "./types";
import { generateSimulatedHistoricalKlines, timeframeToSeconds } from "./mockMarketData";

interface MarketGatewayResponse {
  candles: Candle[];
  source?: string;
}

interface QuoteGatewayResponse {
  quotes: MarketQuote[];
  updatedAt?: number;
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
  const params = new URLSearchParams({
    symbol: binanceSymbol,
    interval: timeframe,
    limit: String(limit)
  });
  const response = await fetch(`/api/market/klines?${params.toString()}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Failed loading market klines for ${binanceSymbol}. ${detail.slice(0, 160)}`);
  }

  const data = await response.json() as MarketGatewayResponse;
  const candles = Array.isArray(data.candles) ? data.candles : [];

  return candles.filter((candle) => (
    Number.isFinite(candle.time) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close)
  ));
}

export async function loadMarketData(
  symbol: MarketSymbol,
  timeframe: string
): Promise<{ candles: Candle[]; isLiveBinance: boolean; source: string; updatedAt: number }> {
  try {
    if (symbol.type === "crypto") {
      try {
        const hist = await fetchHistoricalCryptoKlines(symbol.symbol, timeframe, 200);
        return { candles: hist, isLiveBinance: true, source: "binance", updatedAt: Date.now() };
      } catch (err) {
        warnOnce(
          `rest_${symbol.symbol}`,
          `[Binance REST API call fallback] Failed fetching live data, spawning custom simulation curve. Error details:`,
          err
        );
        const fallback = generateSimulatedHistoricalKlines(symbol, timeframe, 200);
        return { candles: fallback, isLiveBinance: false, source: "simulated", updatedAt: Date.now() };
      }
    } else {
      const simHist = generateSimulatedHistoricalKlines(symbol, timeframe, 200);
      return { candles: simHist, isLiveBinance: false, source: "simulated", updatedAt: Date.now() };
    }
  } catch (err) {
    warnOnce("load_error_ultimate", "Ultimate market data service load exception:", err);
    const fallback = generateSimulatedHistoricalKlines(symbol, timeframe, 200);
    return { candles: fallback, isLiveBinance: false, source: "simulated", updatedAt: Date.now() };
  }
}

export async function getHistoricalCandles(
  symbol: MarketSymbol,
  interval: string
): Promise<{ candles: Candle[]; isLiveBinance: boolean; source: string; updatedAt: number }> {
  return loadMarketData(symbol, interval);
}

export async function fetchMarketQuotes(symbols: MarketSymbol[]): Promise<MarketQuote[]> {
  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.symbol))).filter(Boolean);
  if (uniqueSymbols.length === 0) return [];

  const params = new URLSearchParams({
    symbols: uniqueSymbols.join(",")
  });

  const response = await fetch(`/api/market/quote?${params.toString()}`, {
    headers: { Accept: "application/json" }
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

export function subscribeRealtime(
  symbol: MarketSymbol,
  interval: string,
  onTick: (tick: { time: number; open: number; high: number; low: number; close: number; volume: number; isLive: boolean }) => void
): { close: () => void } {
  let closed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let gatewayFailureCount = 0;

  const startSimulation = () => {
    if (closed) return;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    const simTime = symbol.type === "forex" ? 3000 : 1500;
    let lastClose = symbol.price;
    timer = setInterval(() => {
      if (closed) return;
      const secStep = timeframeToSeconds(interval);
      const now = Math.floor(Date.now() / 1000);
      const currentIntervalAnchor = Math.floor(now / secStep) * secStep;
      const changePercent = (Math.random() - 0.5) * 0.0015; // smooth simulated ticks
      const nextClose = lastClose * (1 + changePercent);
      const high = Math.max(lastClose, nextClose) * (1 + Math.random() * 0.0003);
      const low = Math.min(lastClose, nextClose) * (1 - Math.random() * 0.0003);
      
      onTick({
        time: currentIntervalAnchor,
        open: lastClose,
        high,
        low,
        close: nextClose,
        volume: Math.random() * 8 + 1,
        isLive: false
      });
      lastClose = nextClose;
    }, simTime);
  };

  const pollGatewayLatestCandle = async () => {
    if (closed) return;

    try {
      const latest = await fetchHistoricalCryptoKlines(symbol.symbol, interval, 2);
      const candle = latest[latest.length - 1];
      if (!candle) throw new Error("Gateway returned an empty candle set.");

      gatewayFailureCount = 0;
      onTick({
        ...candle,
        isLive: true
      });
    } catch (err) {
      gatewayFailureCount += 1;
      warnOnce(
        `gateway_poll_${symbol.symbol}`,
        "[Market gateway polling fallback] Realtime polling failed, simulator will start after repeated failures:",
        err
      );

      if (gatewayFailureCount >= 2) {
        if (closed) return;
        startSimulation();
      }
    }
  };

  if (symbol.type === "crypto") {
    pollGatewayLatestCandle();
    timer = setInterval(pollGatewayLatestCandle, 3000);
  } else {
    startSimulation();
  }

  return {
    close: () => {
      closed = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
  };
}

export const safeMarketDataService = {
  getHistoricalCandles,
  subscribeRealtime,
  fetchMarketQuotes
};
