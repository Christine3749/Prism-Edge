import {
  inferMarketSymbolFromInput,
  resolveMarketSymbol
} from "../packages/shared/src/marketCatalog";
import type { MarketSymbol } from "../packages/shared/src/types";
import { BINANCE_ENDPOINTS, MARKET_SYMBOL_RE } from "./config";
import {
  decimalPrecisionFor,
  normalizeMarketSymbol,
  toCoinbaseGranularity,
  toCoinbaseProductId,
  toYahooInterval,
  toYahooRange,
  toYahooSymbol
} from "./marketFormat";
import { parseBinanceKlines, parseYahooCandles } from "./marketParsers";
import type { CoinbaseCandle, MarketQuotePayload, YahooChartPayload } from "./types";

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

export async function fetchYahooChart(symbol: string, interval: string, limit: number): Promise<YahooChartPayload> {
  const yahooSymbol = toYahooSymbol(symbol);
  const yahooInterval = toYahooInterval(interval);
  const range = toYahooRange(interval, limit);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${encodeURIComponent(yahooInterval)}&range=${encodeURIComponent(range)}&includePrePost=false&events=div%2Csplits`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Prism-Edge market data gateway" },
    signal: AbortSignal.timeout(4200)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Yahoo ${yahooSymbol}: ${response.status} ${text.slice(0, 140)}`);

  const data = JSON.parse(text);
  const chartError = data?.chart?.error;
  if (chartError) throw new Error(`Yahoo ${yahooSymbol}: ${chartError.description || chartError.code || "chart error"}`);

  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo ${yahooSymbol}: empty chart response.`);

  const candles = parseYahooCandles(result, limit);
  if (candles.length === 0) throw new Error(`Yahoo ${yahooSymbol}: no candle rows.`);

  const meta = result.meta || {};
  const last = candles[candles.length - 1];
  const price = Number(meta.regularMarketPrice ?? last.close);
  const previousCandle = candles.length > 1 ? candles[candles.length - 2] : undefined;
  const previousClose = Number(meta.previousClose ?? previousCandle?.close ?? meta.chartPreviousClose);
  const rawVolume = Number(meta.regularMarketVolume ?? last.volume ?? 0);
  const precision = decimalPrecisionFor(symbol, price);
  const change24h = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;

  return {
    candles,
    source: "yahoo-delayed",
    quote: {
      symbol,
      price: Number(price.toFixed(precision)),
      change24h: Number(change24h.toFixed(2)),
      volume24h: Number.isFinite(rawVolume) ? rawVolume : 0,
      source: "yahoo-delayed",
      updatedAt: Date.now(),
      isLive: false
    }
  };
}

export async function fetchYahooQuote(symbol: string) {
  const result = await fetchYahooChart(symbol, "1d", 5);
  if (!result.quote) throw new Error(`Yahoo ${symbol}: quote missing from chart payload.`);
  return result.quote;
}

export async function fetchYahooQuoteBatch(symbols: string[]) {
  const normalizedSymbols = Array.from(new Set(symbols.map(normalizeMarketSymbol))).filter(Boolean);
  if (normalizedSymbols.length === 0) return new Map<string, MarketQuotePayload>();

  const yahooSymbols = normalizedSymbols.map(toYahooSymbol);
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbols.join(","))}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Prism-Edge market quote gateway" },
    signal: AbortSignal.timeout(normalizedSymbols.length > 16 ? 6000 : 4500)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Yahoo quote batch: ${response.status} ${text.slice(0, 140)}`);

  const data = JSON.parse(text);
  const rows = Array.isArray(data?.quoteResponse?.result) ? data.quoteResponse.result : [];
  const rowsByYahooSymbol = new Map<string, any>(
    rows.map((row: any) => [String(row?.symbol || "").toUpperCase(), row])
  );
  const now = Date.now();
  const quotes = new Map<string, MarketQuotePayload>();

  normalizedSymbols.forEach((symbol) => {
    const yahooSymbol = toYahooSymbol(symbol).toUpperCase();
    const row = rowsByYahooSymbol.get(yahooSymbol) || rowsByYahooSymbol.get(symbol);
    if (!row) return;
    const price = Number(row.regularMarketPrice ?? row.postMarketPrice ?? row.preMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return;
    const change24h = Number(row.regularMarketChangePercent ?? 0);
    const volume24h = Number(row.regularMarketVolume ?? row.volume ?? 0);
    const precision = decimalPrecisionFor(symbol, price);
    quotes.set(symbol, {
      symbol,
      price: Number(price.toFixed(precision)),
      change24h: Number((Number.isFinite(change24h) ? change24h : 0).toFixed(2)),
      volume24h: Number.isFinite(volume24h) ? volume24h : 0,
      source: "yahoo-delayed",
      updatedAt: now,
      isLive: false
    });
  });

  return quotes;
}

function mapYahooSearchQuote(quote: any): MarketSymbol | null {
  const rawSymbol = String(quote?.symbol || "").trim().toUpperCase();
  if (!rawSymbol || !MARKET_SYMBOL_RE.test(rawSymbol)) return null;
  const known = resolveMarketSymbol(rawSymbol);
  if (known) return known;

  const inferred = inferMarketSymbolFromInput(rawSymbol);
  const quoteType = String(quote?.quoteType || "").toUpperCase();
  const exchange = String(quote?.exchange || inferred?.exchange || quote?.exchDisp || "Yahoo");
  const name = String(quote?.longname || quote?.shortname || quote?.name || inferred?.name || `${rawSymbol} Market Instrument`);
  const type = quoteType === "CURRENCY" ? "forex" : quoteType === "CRYPTOCURRENCY" ? "crypto" : "stock";
  const market: MarketSymbol["market"] = inferred?.market || (rawSymbol.endsWith(".HK") ? "hk" : rawSymbol.endsWith(".SZ") || rawSymbol.endsWith(".SS") ? "cn" : type === "forex" ? "forex" : type === "crypto" ? "crypto" : "us");

  return {
    id: inferred?.id || rawSymbol,
    symbol: inferred?.symbol || rawSymbol,
    name,
    type,
    market,
    exchange,
    currency: inferred?.currency || String(quote?.currency || (market === "hk" ? "HKD" : market === "cn" ? "CNY" : "USD")),
    dataProvider: "yahoo",
    yahooSymbol: inferred?.yahooSymbol || rawSymbol,
    price: Number(quote?.regularMarketPrice || inferred?.price || 0),
    change24h: Number(quote?.regularMarketChangePercent || 0),
    volume24h: Number(quote?.regularMarketVolume || 0),
    precision: inferred?.precision || (type === "forex" ? 5 : 2)
  };
}

export async function fetchYahooSearch(query: string, limit: number) {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0&listsCount=0&enableFuzzyQuery=true`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Prism-Edge market search gateway" },
    signal: AbortSignal.timeout(5000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Yahoo search: ${response.status} ${text.slice(0, 140)}`);

  const data = JSON.parse(text);
  return (Array.isArray(data?.quotes) ? data.quotes : [])
    .map(mapYahooSearchQuote)
    .filter(Boolean)
    .slice(0, limit) as MarketSymbol[];
}
