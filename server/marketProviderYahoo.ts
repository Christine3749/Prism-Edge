import { inferMarketSymbolFromInput, resolveMarketSymbol } from "../packages/shared/src/marketCatalog";
import type { MarketSymbol } from "../packages/shared/src/types";
import { MARKET_SYMBOL_RE } from "./config";
import { decimalPrecisionFor, normalizeMarketSymbol, toYahooInterval, toYahooRange, toYahooSymbol } from "./marketFormat";
import { parseYahooCandles } from "./marketParsers";
import type { MarketQuotePayload, YahooChartPayload } from "./types";
import { providerRawLimitForInterval } from "./marketProviderUtils";

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

  const candles = parseYahooCandles(result, providerRawLimitForInterval(interval, limit));
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
