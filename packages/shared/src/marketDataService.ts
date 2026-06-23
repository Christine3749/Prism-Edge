import { MarketSymbol, Candle } from "./types";
import { generateSimulatedHistoricalKlines, timeframeToSeconds } from "./mockMarketData";

type ImportMetaWithEnv = ImportMeta & {
  env?: Record<string, string | boolean | undefined>;
};

function isLiveBinanceEnabled(): boolean {
  const env = (import.meta as ImportMetaWithEnv).env;
  return env?.VITE_ENABLE_LIVE_BINANCE === "true" || env?.VITE_ENABLE_LIVE_BINANCE === true;
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
  let interval = "1d";
  const tfLower = timeframe.toLowerCase();
  if (tfLower === "1m") interval = "1m";
  else if (tfLower === "5m") interval = "5m";
  else if (tfLower === "15m") interval = "15m";
  else if (tfLower === "1h") interval = "1h";
  else if (tfLower === "4h") interval = "4h";
  else if (tfLower === "1d") interval = "1d";
  else if (tfLower === "1w") interval = "1w";
  else if (tfLower === "1m" && timeframe.slice(-1) === "M") interval = "1M";

  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed loading Binance klines for ${binanceSymbol}`);
  }

  const data = await response.json();
  const candles: Candle[] = data.map((item: any) => ({
    time: Math.round(Number(item[0]) / 1000), // Open time in seconds
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5]),
  }));

  return candles;
}

export async function loadMarketData(
  symbol: MarketSymbol,
  timeframe: string
): Promise<{ candles: Candle[]; isLiveBinance: boolean }> {
  try {
    if (symbol.type === "crypto" && isLiveBinanceEnabled()) {
      try {
        const hist = await fetchHistoricalCryptoKlines(symbol.symbol, timeframe, 200);
        return { candles: hist, isLiveBinance: true };
      } catch (err) {
        warnOnce(
          `rest_${symbol.symbol}`,
          `[Binance REST API call fallback] Failed fetching live data, spawning custom simulation curve. Error details:`,
          err
        );
        const fallback = generateSimulatedHistoricalKlines(symbol, timeframe, 200);
        return { candles: fallback, isLiveBinance: false };
      }
    } else {
      const simHist = generateSimulatedHistoricalKlines(symbol, timeframe, 200);
      return { candles: simHist, isLiveBinance: false };
    }
  } catch (err) {
    warnOnce("load_error_ultimate", "Ultimate market data service load exception:", err);
    const fallback = generateSimulatedHistoricalKlines(symbol, timeframe, 200);
    return { candles: fallback, isLiveBinance: false };
  }
}

export async function getHistoricalCandles(
  symbol: MarketSymbol,
  interval: string
): Promise<{ candles: Candle[]; isLiveBinance: boolean }> {
  return loadMarketData(symbol, interval);
}

export function subscribeRealtime(
  symbol: MarketSymbol,
  interval: string,
  onTick: (tick: { time: number; open: number; high: number; low: number; close: number; volume: number; isLive: boolean }) => void
): { close: () => void } {
  let closed = false;
  let ws: WebSocket | null = null;
  let simInterval: any = null;

  const startSimulation = () => {
    if (closed) return;
    const simTime = symbol.type === "forex" ? 3000 : 1500;
    let lastClose = symbol.price;
    simInterval = setInterval(() => {
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

    if (symbol.type === "crypto" && isLiveBinanceEnabled()) {
      try {
        const bInterval = interval.toLowerCase() === "1d" ? "1d" : interval.toLowerCase();
      const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.symbol.toLowerCase()}@kline_${bInterval}`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        if (closed) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.k) {
            const k = payload.k;
            onTick({
              time: Math.round(k.t / 1000),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              isLive: true
            });
          }
        } catch (e) {
          // Silent json parsing warning
        }
      };

      ws.onerror = (err) => {
        if (closed) return;
        warnOnce(
          `ws_${symbol.symbol}`,
          `[Binance WS Fallback warning] WebSocket connection encountered issue, launching ticking simulation. Details:`,
          err
        );
        if (ws) {
          try { ws.close(); } catch (ex) {}
          ws = null;
        }
        if (!simInterval) {
          startSimulation();
        }
      };

      ws.onclose = () => {
        if (closed) return;
        if (!simInterval) {
          startSimulation();
        }
      };

    } catch (err) {
      warnOnce(`ws_init_${symbol.symbol}`, "[Binance WS Exception] Initialization exception:", err);
      startSimulation();
    }
  } else {
    startSimulation();
  }

  return {
    close: () => {
      closed = true;
      if (ws) {
        try { ws.close(); } catch (e) {}
        ws = null;
      }
      if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
      }
    }
  };
}

export const safeMarketDataService = {
  getHistoricalCandles,
  subscribeRealtime
};
