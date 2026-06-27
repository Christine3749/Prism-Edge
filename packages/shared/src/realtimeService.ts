import type { Candle, MarketSymbol } from "./types";
import { fetchHistoricalGatewayKlines } from "./marketDataService";
import { timeframeToSeconds } from "./mockMarketData";

export interface RealtimeTick {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isLive: boolean;
  source?: string;
}

type TickCallback = (tick: RealtimeTick) => void;

const warnedKeys = new Set<string>();
function warnOnce(key: string, ...args: unknown[]) {
  if (!warnedKeys.has(key)) { warnedKeys.add(key); console.warn(...args); }
}

function isLiveSource(source: string) {
  const s = source.toLowerCase();
  return s.includes("binance") || s.includes("coinbase");
}

// ─── Polling fallback ────────────────────────────────────────────────────────

function subscribePolling(symbol: MarketSymbol, interval: string, onTick: TickCallback): () => void {
  let closed = false;
  let inFlight = false;
  let failCount = 0;
  let simTimer: ReturnType<typeof setInterval> | null = null;

  function startSim() {
    if (simTimer) return;
    let lastClose = symbol.price;
    const simMs = symbol.type === "forex" ? 3000 : 1500;
    simTimer = setInterval(() => {
      if (closed) return;
      const secStep = timeframeToSeconds(interval);
      const now = Math.floor(Date.now() / 1000);
      const anchor = Math.floor(now / secStep) * secStep;
      const volUnit = symbol.type === "forex" ? 0.00035 : symbol.type === "crypto" ? 0.003 : 0.0016;
      const pct = (Math.random() - 0.48) * volUnit;
      const close = lastClose * (1 + pct);
      const high = Math.max(lastClose, close) * (1 + Math.random() * 0.0003);
      const low = Math.min(lastClose, close) * (1 - Math.random() * 0.0003);
      onTick({ time: anchor, open: lastClose, high, low, close, volume: Math.random() * 8 + 1, isLive: false, source: "simulated" });
      lastClose = close;
    }, simMs);
  }

  async function poll() {
    if (closed || inFlight) return;
    inFlight = true;
    try {
      const result = await fetchHistoricalGatewayKlines(symbol.symbol, interval, 2);
      const candle = result.candles[result.candles.length - 1];
      if (!candle) throw new Error("empty candle");
      failCount = 0;
      onTick({ ...candle, isLive: isLiveSource(result.source), source: result.source });
    } catch (err) {
      failCount++;
      warnOnce(`poll_fail_${symbol.symbol}`, "[realtime polling] gateway failed, fallback may start:", err);
      if (failCount >= 2 && !simTimer) startSim();
    } finally {
      inFlight = false;
    }
  }

  poll();
  const pollMs = symbol.type === "crypto" ? 2500 : 7000;
  const timer = setInterval(poll, pollMs);

  return () => {
    closed = true;
    clearInterval(timer);
    if (simTimer) clearInterval(simTimer);
  };
}

// ─── WebSocket path (crypto only) ────────────────────────────────────────────

function buildWsUrl(symbol: MarketSymbol, interval: string): string {
  const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss:" : "ws:";
  const host = typeof location !== "undefined" ? location.host : "localhost:3000";
  return `${proto}//${host}/ws?symbol=${encodeURIComponent(symbol.symbol)}&interval=${encodeURIComponent(interval)}`;
}

function subscribeWs(symbol: MarketSymbol, interval: string, onTick: TickCallback): () => void {
  let closed = false;
  let ws: WebSocket | null = null;
  let pollUnsub: (() => void) | null = null;
  let lastMessageAt = Date.now();
  let watchdog: ReturnType<typeof setInterval> | null = null;

  function fallback() {
    if (closed || pollUnsub) return;
    warnOnce(`ws_fallback_${symbol.symbol}`, "[realtime ws] WebSocket unavailable or quiet, falling back to polling.");
    try { ws?.close(); } catch { /* ignore */ }
    if (watchdog) {
      clearInterval(watchdog);
      watchdog = null;
    }
    pollUnsub = subscribePolling(symbol, interval, onTick);
  }

  try {
    ws = new WebSocket(buildWsUrl(symbol, interval));
    ws.onopen = () => { lastMessageAt = Date.now(); };
    watchdog = setInterval(() => {
      if (!closed && !pollUnsub && Date.now() - lastMessageAt > 4500) fallback();
    }, 1500);

    ws.onmessage = (event) => {
      lastMessageAt = Date.now();
      if (closed) return;
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.type !== "tick") return;
        onTick({
          time: msg.time,
          open: msg.open,
          high: msg.high,
          low: msg.low,
          close: msg.close,
          volume: msg.volume,
          isLive: Boolean(msg.isLive),
          source: msg.source,
        });
      } catch { /* ignore */ }
    };

    ws.onerror = () => { ws?.close(); fallback(); };
    ws.onclose = (ev) => { if (!closed && !ev.wasClean) fallback(); };
  } catch {
    fallback();
  }

  return () => {
    closed = true;
    if (watchdog) clearInterval(watchdog);
    ws?.close();
    pollUnsub?.();
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function subscribeRealtime(
  symbol: MarketSymbol,
  interval: string,
  onTick: TickCallback
): { close: () => void } {
  const unsub = symbol.type === "crypto"
    ? subscribeWs(symbol, interval, onTick)
    : subscribePolling(symbol, interval, onTick);
  return { close: unsub };
}

export function updateCandlesFromTick(
  prevCandles: Candle[],
  tick: RealtimeTick,
  precision: number,
  interval: string
): Candle[] {
  if (prevCandles.length === 0) return prevCandles;
  const last = prevCandles[prevCandles.length - 1];
  const secStep = timeframeToSeconds(interval);
  const candleTime = Math.floor(tick.time / secStep) * secStep;
  const close = Number(tick.close.toFixed(precision));

  if (candleTime > last.time) {
    const open = tick.isLive ? tick.open : last.close;
    return [...prevCandles.slice(1), {
      time: candleTime,
      open,
      high: Number(Math.max(open, tick.high, close).toFixed(precision)),
      low: Number(Math.min(open, tick.low, close).toFixed(precision)),
      close,
      volume: tick.volume,
    }];
  }

  if (candleTime < last.time) return prevCandles;

  return [...prevCandles.slice(0, -1), {
    ...last,
    high: Number(Math.max(last.high, tick.high, close).toFixed(precision)),
    low: Number(Math.min(last.low, tick.low, close).toFixed(precision)),
    close,
    volume: tick.isLive ? tick.volume : last.volume + tick.volume,
  }];
}
