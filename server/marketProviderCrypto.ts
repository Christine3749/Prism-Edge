import { BINANCE_ENDPOINTS } from "./config";
import { toCoinbaseGranularity, toCoinbaseProductId } from "./marketFormat";
import { parseBinanceKlines, toStrictNumber } from "./marketParsers";
import type { CoinbaseCandle, MarketQuotePayload } from "./types";
import { buildQuotePayload } from "./marketProviderUtils";

export async function fetchBinanceKlines(symbol: string, interval: string, limit: number) {
  const errors: string[] = [];

  for (const baseUrl of BINANCE_ENDPOINTS) {
    const url = `${baseUrl}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
      const text = await response.text();
      if (!response.ok) {
        errors.push(`${baseUrl}: ${response.status} ${text.slice(0, 140)}`);
        continue;
      }
      return parseBinanceKlines(JSON.parse(text));
    } catch (error: any) {
      errors.push(`${baseUrl}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(" | ") || "All Binance endpoints failed.");
}

export async function fetchBinanceQuote(symbol: string): Promise<MarketQuotePayload> {
  const errors: string[] = [];

  for (const baseUrl of BINANCE_ENDPOINTS) {
    const url = `${baseUrl}/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3500) });
      const text = await response.text();
      if (!response.ok) {
        errors.push(`${baseUrl}: ${response.status} ${text.slice(0, 120)}`);
        continue;
      }

      const data = JSON.parse(text);
      const price = Number(data.lastPrice);
      const change24h = Number(data.priceChangePercent);
      const volume24h = Number(data.quoteVolume || data.volume);
      if (![price, change24h, volume24h].every(Number.isFinite)) {
        throw new Error("Binance quote response missing numeric fields.");
      }
      return { symbol, price, change24h, volume24h, source: "binance", updatedAt: Date.now(), isLive: true };
    } catch (error: any) {
      errors.push(`${baseUrl}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(" | ") || "All Binance quote endpoints failed.");
}

export async function fetchCoinbaseKlines(symbol: string, interval: string, limit: number) {
  const productId = toCoinbaseProductId(symbol);
  const granularity = toCoinbaseGranularity(interval);
  const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(productId)}/candles?granularity=${granularity}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Prism-Edge market data gateway" },
    signal: AbortSignal.timeout(4500)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Coinbase ${productId}: ${response.status} ${text.slice(0, 140)}`);

  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error(`Coinbase ${productId}: candle response was not an array.`);

  return (data as CoinbaseCandle[])
    .map((item) => ({
      time: Number(item[0]),
      open: Number(item[3]),
      high: Number(item[2]),
      low: Number(item[1]),
      close: Number(item[4]),
      volume: Number(item[5])
    }))
    .filter((candle) => (
      Number.isFinite(candle.time) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ))
    .sort((a, b) => a.time - b.time)
    .slice(-limit);
}

export async function fetchCoinbaseQuote(symbol: string): Promise<MarketQuotePayload> {
  const productId = toCoinbaseProductId(symbol);
  const response = await fetch(`https://api.exchange.coinbase.com/products/${encodeURIComponent(productId)}/ticker`, {
    headers: { "User-Agent": "Prism-Edge market data gateway" },
    signal: AbortSignal.timeout(3500)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Coinbase ${productId}: ${response.status} ${text.slice(0, 140)}`);

  const data = JSON.parse(text);
  const price = Number(data.price);
  const volume24h = Number(data.volume || 0) * price;
  if (!Number.isFinite(price) || price <= 0) throw new Error(`Coinbase ${productId}: quote missing price.`);
  return buildQuotePayload(symbol, price, 0, Number.isFinite(volume24h) ? volume24h : 0, "coinbase");
}
