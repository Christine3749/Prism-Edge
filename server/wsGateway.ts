import type { IncomingMessage } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { subscribeClient } from "./binanceWs";
import { MARKET_SYMBOL_RE } from "./config";
import { isCryptoMarketSymbol, normalizeMarketSymbol } from "./marketFormat";

const VALID_INTERVAL = new Set([
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "8h", "12h",
  "1D", "1W",
]);

export function createWsGateway(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (client: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const symbol = normalizeMarketSymbol(url.searchParams.get("symbol") ?? "");
    const interval = url.searchParams.get("interval") ?? "1D";

    if (
      !symbol ||
      !MARKET_SYMBOL_RE.test(symbol) ||
      !isCryptoMarketSymbol(symbol) ||
      !VALID_INTERVAL.has(interval)
    ) {
      client.send(JSON.stringify({ type: "error", message: "Unsupported symbol or interval." }));
      client.close(1008, "Unsupported");
      return;
    }

    const unsubscribe = subscribeClient(symbol, interval, client);
    client.once("close", unsubscribe);
    client.once("error", unsubscribe);
    client.send(JSON.stringify({ type: "subscribed", symbol, interval }));
  });

  return wss;
}
