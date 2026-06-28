import WebSocket from "ws";

const BINANCE_WS_ENDPOINTS = [
  "wss://stream.binance.com:9443/ws",
  "wss://stream.binance.com:443/ws",
];
const RECONNECT_BASE_MS = 3_000;
const RECONNECT_MAX_MS = 60_000;

interface PoolEntry {
  ws: WebSocket | null;
  clients: Set<WebSocket>;
  retries: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  symbol: string;
  interval: string;
  endpointIdx: number;
}

const pool = new Map<string, PoolEntry>();

function toWsInterval(interval: string): string {
  if (interval === "1D") return "1d";
  if (interval === "1W") return "1w";
  return interval.toLowerCase();
}

function forward(entry: PoolEntry, data: string): void {
  for (const client of entry.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(data); } catch { /* skip dead client */ }
    }
  }
}

function connectPool(key: string): void {
  const entry = pool.get(key);
  if (!entry) return;

  const base = BINANCE_WS_ENDPOINTS[entry.endpointIdx % BINANCE_WS_ENDPOINTS.length];
  const stream = `${entry.symbol.toLowerCase()}@kline_${toWsInterval(entry.interval)}`;
  const ws = new WebSocket(`${base}/${stream}`);
  entry.ws = ws;

  ws.on("open", () => {
    entry.retries = 0;
    forward(entry, JSON.stringify({ type: "connected", stream: key }));
  });

  ws.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.e !== "kline") return;
      const k = msg.k;
      forward(entry, JSON.stringify({
        type: "tick",
        time: Math.floor(Number(k.t) / 1000),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
        closed: Boolean(k.x),
        isLive: true,
        source: "binance-ws",
      }));
    } catch { /* ignore malformed */ }
  });

  ws.on("error", (err) => {
    console.warn(`[binanceWs] ${key}:`, err.message);
    entry.endpointIdx++;
  });

  ws.on("close", () => {
    entry.ws = null;
    if (entry.clients.size === 0) { pool.delete(key); return; }
    const exp = Math.min(entry.retries, 6);
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** exp, RECONNECT_MAX_MS);
    entry.retries++;
    entry.reconnectTimer = setTimeout(() => {
      if (pool.has(key)) connectPool(key);
    }, delay);
  });
}

export function subscribeClient(symbol: string, interval: string, client: WebSocket): () => void {
  const key = `${symbol}:${interval}`;
  let entry = pool.get(key);

  if (!entry) {
    entry = {
      ws: null,
      clients: new Set(),
      retries: 0,
      reconnectTimer: null,
      symbol,
      interval,
      endpointIdx: 0,
    };
    pool.set(key, entry);
    connectPool(key);
  }
  entry.clients.add(client);

  return () => {
    const e = pool.get(key);
    if (!e) return;
    e.clients.delete(client);
    if (e.clients.size > 0) return;
    if (e.reconnectTimer) clearTimeout(e.reconnectTimer);
    if (e.ws) {
      const ws = e.ws;
      e.ws = null;
      ws.removeAllListeners();
      ws.on("error", () => {});
      try { ws.terminate(); } catch { /* ignore shutdown race */ }
    }
    pool.delete(key);
    console.log(`[binanceWs] stream closed (no subscribers): ${key}`);
  };
}

export function getWsPoolStatus(): Record<string, { clients: number; ready: boolean }> {
  return Object.fromEntries(
    Array.from(pool.entries()).map(([key, e]) => [
      key,
      { clients: e.clients.size, ready: e.ws?.readyState === WebSocket.OPEN },
    ])
  );
}
