import {
  inferMarketSymbolFromInput,
  resolveMarketSymbol
} from "../packages/shared/src/marketCatalog";
import type { MarketSymbol } from "../packages/shared/src/types";
import {
  ALPHA_VANTAGE_API_KEY,
  BINANCE_ENDPOINTS,
  FINNHUB_API_KEY,
  MARKET_SYMBOL_RE,
  POLYGON_API_KEY,
  TWELVE_DATA_API_KEY
} from "./config";
import {
  decimalPrecisionFor,
  normalizeMarketSymbol,
  toCoinbaseGranularity,
  toCoinbaseProductId,
  toYahooInterval,
  toYahooRange,
  toYahooSymbol
} from "./marketFormat";
import { parseBinanceKlines, parseYahooCandles, toStrictNumber } from "./marketParsers";
import type { Candle, CoinbaseCandle, MarketQuotePayload, YahooChartPayload } from "./types";

const PROVIDER_TIMEOUT_MS = 5200;

export function isPolygonConfigured() {
  return Boolean(POLYGON_API_KEY);
}

export function isTwelveDataConfigured() {
  return Boolean(TWELVE_DATA_API_KEY);
}

export function isFinnhubConfigured() {
  return Boolean(FINNHUB_API_KEY);
}

export function isAlphaVantageConfigured() {
  return Boolean(ALPHA_VANTAGE_API_KEY);
}

export function hasConfiguredPremiumProvider() {
  return isPolygonConfigured() || isTwelveDataConfigured() || isFinnhubConfigured() || isAlphaVantageConfigured();
}

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

export async function fetchPolygonChart(symbol: string, interval: string, limit: number): Promise<YahooChartPayload> {
  if (!POLYGON_API_KEY) throw new Error("Polygon provider is not configured.");
  const ticker = toPolygonTicker(symbol);
  if (!ticker) throw new Error(`Polygon does not support ${symbol} in this gateway route.`);

  const { multiplier, timespan, lookbackSeconds } = toPolygonRange(interval, limit);
  const to = toDateOnly(Math.floor(Date.now() / 1000));
  const from = toDateOnly(Math.floor(Date.now() / 1000) - lookbackSeconds);
  const params = new URLSearchParams({ adjusted: "true", sort: "asc", limit: String(Math.max(limit, 50)), apiKey: POLYGON_API_KEY });
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${multiplier}/${timespan}/${from}/${to}?${params.toString()}`;
  const data = await fetchJson(url, "Polygon");
  const rows = Array.isArray(data?.results) ? data.results : [];
  const candles = rows.map((row: any) => ({
    time: Math.round(Number(row.t) / 1000),
    open: Number(row.o),
    high: Number(row.h),
    low: Number(row.l),
    close: Number(row.c),
    volume: Number(row.v || 0)
  })).filter(isUsableCandle).slice(-limit);

  if (candles.length === 0) throw new Error(`Polygon ${ticker}: no candle rows.`);
  return buildChartPayload(symbol, candles, "polygon-delayed");
}

export async function fetchPolygonQuote(symbol: string): Promise<MarketQuotePayload> {
  const payload = await fetchPolygonChart(symbol, "1d", 3);
  if (!payload.quote) throw new Error(`Polygon ${symbol}: quote missing from chart payload.`);
  return payload.quote;
}

export async function fetchTwelveDataChart(symbol: string, interval: string, limit: number): Promise<YahooChartPayload> {
  if (!TWELVE_DATA_API_KEY) throw new Error("Twelve Data provider is not configured.");
  const providerSymbol = toTwelveDataSymbol(symbol);
  if (!providerSymbol) throw new Error(`Twelve Data does not support ${symbol} in this gateway route.`);

  const params = new URLSearchParams({
    symbol: providerSymbol,
    interval: toTwelveDataInterval(interval),
    outputsize: String(Math.max(2, Math.min(limit, 5000))),
    apikey: TWELVE_DATA_API_KEY
  });
  const data = await fetchJson(`https://api.twelvedata.com/time_series?${params.toString()}`, "Twelve Data");
  if (data?.status === "error") throw new Error(`Twelve Data ${providerSymbol}: ${data?.message || "provider error"}`);

  const values = Array.isArray(data?.values) ? data.values : [];
  const candles = values.map((row: any) => ({
    time: parseProviderTime(row.datetime),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume || 0)
  })).filter(isUsableCandle).sort((a, b) => a.time - b.time).slice(-limit);

  if (candles.length === 0) throw new Error(`Twelve Data ${providerSymbol}: no candle rows.`);
  return buildChartPayload(symbol, candles, "twelve-data-delayed");
}

export async function fetchTwelveDataQuote(symbol: string): Promise<MarketQuotePayload> {
  if (!TWELVE_DATA_API_KEY) throw new Error("Twelve Data provider is not configured.");
  const providerSymbol = toTwelveDataSymbol(symbol);
  if (!providerSymbol) throw new Error(`Twelve Data does not support ${symbol} in this gateway route.`);

  const params = new URLSearchParams({ symbol: providerSymbol, apikey: TWELVE_DATA_API_KEY });
  const data = await fetchJson(`https://api.twelvedata.com/quote?${params.toString()}`, "Twelve Data");
  if (data?.status === "error") throw new Error(`Twelve Data ${providerSymbol}: ${data?.message || "provider error"}`);

  const price = Number(data.close ?? data.price ?? data.previous_close);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`Twelve Data ${providerSymbol}: quote missing price.`);
  const previousClose = Number(data.previous_close || data.open || price);
  const change24h = previousClose ? ((price - previousClose) / previousClose) * 100 : Number(data.percent_change || 0);
  return buildQuotePayload(symbol, price, change24h, Number(data.volume || 0), "twelve-data-delayed");
}

export async function fetchFinnhubChart(symbol: string, interval: string, limit: number): Promise<YahooChartPayload> {
  if (!FINNHUB_API_KEY) throw new Error("Finnhub provider is not configured.");
  const providerSymbol = toFinnhubSymbol(symbol);
  if (!providerSymbol) throw new Error(`Finnhub does not support ${symbol} in this gateway route.`);

  const isForex = isForexLike(symbol);
  const isCrypto = isCryptoLike(symbol);
  const path = isForex ? "forex/candle" : isCrypto ? "crypto/candle" : "stock/candle";
  const resolution = toFinnhubResolution(interval);
  const to = Math.floor(Date.now() / 1000);
  const from = to - lookbackSecondsFor(interval, limit);
  const params = new URLSearchParams({ symbol: providerSymbol, resolution, from: String(from), to: String(to), token: FINNHUB_API_KEY });
  const data = await fetchJson(`https://finnhub.io/api/v1/${path}?${params.toString()}`, "Finnhub");
  if (data?.s !== "ok") throw new Error(`Finnhub ${providerSymbol}: ${data?.s || "provider error"}`);

  const times = Array.isArray(data.t) ? data.t : [];
  const candles = times.map((time: number, index: number) => ({
    time: Number(time),
    open: Number(data.o?.[index]),
    high: Number(data.h?.[index]),
    low: Number(data.l?.[index]),
    close: Number(data.c?.[index]),
    volume: Number(data.v?.[index] || 0)
  })).filter(isUsableCandle).slice(-limit);

  if (candles.length === 0) throw new Error(`Finnhub ${providerSymbol}: no candle rows.`);
  return buildChartPayload(symbol, candles, "finnhub-delayed");
}

export async function fetchFinnhubQuote(symbol: string): Promise<MarketQuotePayload> {
  if (!FINNHUB_API_KEY) throw new Error("Finnhub provider is not configured.");
  const providerSymbol = toFinnhubSymbol(symbol);
  if (!providerSymbol) throw new Error(`Finnhub does not support ${symbol} in this gateway route.`);

  const data = await fetchJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(providerSymbol)}&token=${encodeURIComponent(FINNHUB_API_KEY)}`, "Finnhub");
  const price = Number(data.c || data.pc || 0);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`Finnhub ${providerSymbol}: quote missing price.`);
  const previousClose = Number(data.pc || price);
  const change24h = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
  return buildQuotePayload(symbol, price, change24h, 0, "finnhub-delayed");
}

export async function fetchAlphaVantageChart(symbol: string, interval: string, limit: number): Promise<YahooChartPayload> {
  if (!ALPHA_VANTAGE_API_KEY) throw new Error("Alpha Vantage provider is not configured.");
  const profile = resolveMarketSymbol(symbol) || inferMarketSymbolFromInput(symbol);
  if (profile?.market && !["forex", "us", "crypto"].includes(profile.market)) {
    throw new Error(`Alpha Vantage does not support ${symbol} in this gateway route.`);
  }

  const data = isCryptoLike(symbol)
    ? await fetchAlphaVantageCryptoSeries(symbol, interval)
    : isForexLike(symbol)
      ? await fetchAlphaVantageForexSeries(symbol, interval)
      : await fetchAlphaVantageStockSeries(symbol, interval);
  const candles = parseAlphaTimeSeries(data).slice(-limit);
  if (candles.length === 0) throw new Error(`Alpha Vantage ${symbol}: no candle rows.`);
  return buildChartPayload(symbol, candles, "alpha-vantage-delayed");
}

export async function fetchAlphaVantageQuote(symbol: string): Promise<MarketQuotePayload> {
  if (!ALPHA_VANTAGE_API_KEY) throw new Error("Alpha Vantage provider is not configured.");
  if (isForexLike(symbol) || isCryptoLike(symbol)) {
    const pair = isCryptoLike(symbol) ? splitCryptoPair(symbol) : splitForexPair(symbol);
    if (!pair) throw new Error(`Alpha Vantage ${symbol}: invalid currency pair.`);
    const params = new URLSearchParams({ function: "CURRENCY_EXCHANGE_RATE", from_currency: pair.base, to_currency: pair.quote, apikey: ALPHA_VANTAGE_API_KEY });
    const data = await fetchJson(`https://www.alphavantage.co/query?${params.toString()}`, "Alpha Vantage");
    const rate = Number(data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"] || 0);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Alpha Vantage ${symbol}: quote missing rate.`);
    return buildQuotePayload(symbol, rate, 0, 0, "alpha-vantage-delayed");
  }

  const params = new URLSearchParams({ function: "GLOBAL_QUOTE", symbol: normalizeMarketSymbol(symbol), apikey: ALPHA_VANTAGE_API_KEY });
  const data = await fetchJson(`https://www.alphavantage.co/query?${params.toString()}`, "Alpha Vantage");
  const quote = data?.["Global Quote"] || {};
  const price = Number(quote["05. price"] || 0);
  const change24h = Number(String(quote["10. change percent"] || "0").replace("%", ""));
  const volume24h = Number(quote["06. volume"] || 0);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`Alpha Vantage ${symbol}: quote missing price.`);
  return buildQuotePayload(symbol, price, change24h, volume24h, "alpha-vantage-delayed");
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

async function fetchJson(url: string, provider: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Prism-Edge market data gateway" },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${provider}: ${response.status} ${text.slice(0, 160)}`);
  const data = JSON.parse(text);
  if (data?.Information || data?.Note) throw new Error(`${provider}: ${data.Information || data.Note}`);
  if (data?.error || data?.Error) throw new Error(`${provider}: ${data.error || data.Error}`);
  return data;
}

function buildChartPayload(symbol: string, candles: Candle[], source: string): YahooChartPayload {
  const last = candles[candles.length - 1];
  const previous = candles.length > 1 ? candles[candles.length - 2] : undefined;
  const previousClose = previous?.close || last.open || last.close;
  const change24h = previousClose ? ((last.close - previousClose) / previousClose) * 100 : 0;
  return {
    candles,
    source,
    quote: buildQuotePayload(symbol, last.close, change24h, last.volume, source)
  };
}

function buildQuotePayload(symbol: string, price: number, change24h: number, volume24h: number, source: string): MarketQuotePayload {
  const precision = decimalPrecisionFor(symbol, price);
  return {
    symbol,
    price: Number(price.toFixed(precision)),
    change24h: Number((Number.isFinite(change24h) ? change24h : 0).toFixed(2)),
    volume24h: Number.isFinite(volume24h) ? volume24h : 0,
    source,
    updatedAt: Date.now(),
    isLive: false
  };
}

function isUsableCandle(candle: Candle) {
  return Number.isFinite(candle.time) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    candle.open > 0 &&
    candle.high > 0 &&
    candle.low > 0 &&
    candle.close > 0 &&
    candle.low <= candle.high;
}

function getProfile(symbol: string) {
  return resolveMarketSymbol(symbol) || inferMarketSymbolFromInput(symbol);
}

function isForexLike(symbol: string) {
  const profile = getProfile(symbol);
  if (profile) return profile.type === "forex";
  const normalized = normalizeMarketSymbol(symbol).replace("/", "").replace("=X", "");
  return /^[A-Z]{6}$/.test(normalized) && !normalized.endsWith("USDT");
}

function isCryptoLike(symbol: string) {
  const profile = getProfile(symbol);
  if (profile) return profile.type === "crypto";
  const normalized = normalizeMarketSymbol(symbol).replace("/", "").replace("-", "");
  return /^[A-Z0-9]{2,16}(USDT|USDC|USD)$/.test(normalized);
}

function splitForexPair(symbol: string): { base: string; quote: string } | null {
  const profile = getProfile(symbol);
  const fromId = profile?.id?.includes("/") ? profile.id.replace("/", "") : "";
  const normalized = (fromId || normalizeMarketSymbol(symbol)).replace("/", "").replace("=X", "");
  if (!/^[A-Z]{6}$/.test(normalized)) return null;
  return { base: normalized.slice(0, 3), quote: normalized.slice(3, 6) };
}

function splitCryptoPair(symbol: string): { base: string; quote: string } | null {
  const profile = getProfile(symbol);
  const fromId = profile?.id?.includes("/") ? profile.id.replace("/", "") : "";
  const normalized = (fromId || normalizeMarketSymbol(symbol)).replace("/", "").replace("-", "");
  const quote = ["USDT", "USDC", "USD"].find((candidate) => normalized.endsWith(candidate));
  if (!quote) return null;
  const base = normalized.slice(0, -quote.length);
  if (!base) return null;
  return { base, quote: quote === "USDT" ? "USD" : quote };
}

function toPolygonTicker(symbol: string) {
  const profile = getProfile(symbol);
  const pair = splitForexPair(symbol);
  const cryptoPair = splitCryptoPair(symbol);
  if (profile?.type === "forex" && pair) return `C:${pair.base}${pair.quote}`;
  if (cryptoPair) return `X:${cryptoPair.base}${cryptoPair.quote}`;
  if (profile?.market === "us" || (!profile && /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))) return normalizeMarketSymbol(symbol);
  return "";
}

function toTwelveDataSymbol(symbol: string) {
  const profile = getProfile(symbol);
  const pair = splitForexPair(symbol);
  if (pair) return `${pair.base}/${pair.quote}`;
  if (profile?.type === "crypto" && profile.id.includes("/")) return profile.id;
  if (profile?.market === "us") return profile.symbol;
  if (profile?.market === "hk" || profile?.market === "cn") return profile.yahooSymbol || profile.symbol;
  if (!profile && MARKET_SYMBOL_RE.test(symbol)) return normalizeMarketSymbol(symbol);
  return "";
}

function toFinnhubSymbol(symbol: string) {
  const profile = getProfile(symbol);
  const pair = splitForexPair(symbol);
  const cryptoPair = splitCryptoPair(symbol);
  if (pair) return `OANDA:${pair.base}_${pair.quote}`;
  if (cryptoPair) return `BINANCE:${cryptoPair.base}${cryptoPair.quote === "USD" ? "USDT" : cryptoPair.quote}`;
  if (profile?.market === "us" || (!profile && /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))) return normalizeMarketSymbol(symbol);
  return "";
}

function toTwelveDataInterval(interval: string) {
  switch (interval) {
    case "1m": return "1min";
    case "3m": return "5min";
    case "5m": return "5min";
    case "15m": return "15min";
    case "30m": return "30min";
    case "1h": return "1h";
    case "2h": return "2h";
    case "4h": return "4h";
    case "1w": return "1week";
    case "1M": return "1month";
    default: return "1day";
  }
}

function toFinnhubResolution(interval: string) {
  switch (interval) {
    case "1m": return "1";
    case "3m":
    case "5m": return "5";
    case "15m": return "15";
    case "30m": return "30";
    case "1h":
    case "2h":
    case "4h": return "60";
    case "1w": return "W";
    case "1M": return "M";
    default: return "D";
  }
}

function toPolygonRange(interval: string, limit: number) {
  const base = Math.max(limit, 80);
  switch (interval) {
    case "1m": return { multiplier: 1, timespan: "minute", lookbackSeconds: base * 60 * 2 };
    case "3m": return { multiplier: 3, timespan: "minute", lookbackSeconds: base * 180 * 2 };
    case "5m": return { multiplier: 5, timespan: "minute", lookbackSeconds: base * 300 * 2 };
    case "15m": return { multiplier: 15, timespan: "minute", lookbackSeconds: base * 900 * 2 };
    case "30m": return { multiplier: 30, timespan: "minute", lookbackSeconds: base * 1800 * 2 };
    case "1h": return { multiplier: 1, timespan: "hour", lookbackSeconds: base * 3600 * 2 };
    case "2h": return { multiplier: 2, timespan: "hour", lookbackSeconds: base * 7200 * 2 };
    case "4h": return { multiplier: 4, timespan: "hour", lookbackSeconds: base * 14400 * 2 };
    case "1w": return { multiplier: 1, timespan: "week", lookbackSeconds: base * 604800 * 2 };
    case "1M": return { multiplier: 1, timespan: "month", lookbackSeconds: base * 2678400 * 2 };
    default: return { multiplier: 1, timespan: "day", lookbackSeconds: base * 86400 * 2 };
  }
}

function lookbackSecondsFor(interval: string, limit: number) {
  const step = interval === "1m" ? 60 :
    interval === "3m" ? 180 :
    interval === "5m" ? 300 :
    interval === "15m" ? 900 :
    interval === "30m" ? 1800 :
    interval === "1h" ? 3600 :
    interval === "2h" ? 7200 :
    interval === "4h" ? 14400 :
    interval === "1w" ? 604800 :
    interval === "1M" ? 2678400 :
    86400;
  return Math.max(limit, 80) * step * 3;
}

function toDateOnly(seconds: number) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function parseProviderTime(value: unknown) {
  if (typeof value === "number") return value > 10_000_000_000 ? Math.round(value / 1000) : value;
  const text = String(value || "").trim();
  if (!text) return 0;
  const parsed = Date.parse(text.includes("T") ? text : `${text}T00:00:00Z`);
  return Number.isFinite(parsed) ? Math.round(parsed / 1000) : 0;
}

async function fetchAlphaVantageForexSeries(symbol: string, interval: string) {
  const pair = splitForexPair(symbol);
  if (!pair) throw new Error(`Alpha Vantage ${symbol}: invalid forex pair.`);
  const intraday = ["1m", "5m", "15m", "30m", "1h", "2h", "4h"].includes(interval);
  const params = new URLSearchParams({
    function: intraday ? "FX_INTRADAY" : interval === "1w" ? "FX_WEEKLY" : interval === "1M" ? "FX_MONTHLY" : "FX_DAILY",
    from_symbol: pair.base,
    to_symbol: pair.quote,
    apikey: ALPHA_VANTAGE_API_KEY,
    outputsize: "compact"
  });
  if (intraday) params.set("interval", interval === "1m" ? "1min" : interval === "5m" ? "5min" : interval === "15m" ? "15min" : interval === "30m" ? "30min" : "60min");
  return fetchJson(`https://www.alphavantage.co/query?${params.toString()}`, "Alpha Vantage");
}

async function fetchAlphaVantageStockSeries(symbol: string, interval: string) {
  const normalized = normalizeMarketSymbol(symbol);
  const intraday = ["1m", "5m", "15m", "30m", "1h", "2h", "4h"].includes(interval);
  const params = new URLSearchParams({
    function: intraday ? "TIME_SERIES_INTRADAY" : interval === "1w" ? "TIME_SERIES_WEEKLY" : interval === "1M" ? "TIME_SERIES_MONTHLY" : "TIME_SERIES_DAILY",
    symbol: normalized,
    apikey: ALPHA_VANTAGE_API_KEY,
    outputsize: "compact"
  });
  if (intraday) params.set("interval", interval === "1m" ? "1min" : interval === "5m" ? "5min" : interval === "15m" ? "15min" : interval === "30m" ? "30min" : "60min");
  return fetchJson(`https://www.alphavantage.co/query?${params.toString()}`, "Alpha Vantage");
}

async function fetchAlphaVantageCryptoSeries(symbol: string, interval: string) {
  const pair = splitCryptoPair(symbol);
  if (!pair) throw new Error(`Alpha Vantage ${symbol}: invalid crypto pair.`);
  const params = new URLSearchParams({
    function: interval === "1w" ? "DIGITAL_CURRENCY_WEEKLY" : interval === "1M" ? "DIGITAL_CURRENCY_MONTHLY" : "DIGITAL_CURRENCY_DAILY",
    symbol: pair.base,
    market: pair.quote,
    apikey: ALPHA_VANTAGE_API_KEY
  });
  return fetchJson(`https://www.alphavantage.co/query?${params.toString()}`, "Alpha Vantage");
}

function parseAlphaTimeSeries(data: any): Candle[] {
  const key = Object.keys(data || {}).find((item) => item.toLowerCase().includes("time series"));
  const series = key ? data[key] : null;
  if (!series || typeof series !== "object") return [];

  return Object.entries(series).map(([time, row]: [string, any]) => {
    const open = readAlphaNumber(row, "open");
    const high = readAlphaNumber(row, "high");
    const low = readAlphaNumber(row, "low");
    const close = readAlphaNumber(row, "close");
    return {
      time: parseProviderTime(time),
      open: open ?? 0,
      high: high ?? 0,
      low: low ?? 0,
      close: close ?? 0,
      volume: readAlphaNumber(row, "volume") || 0
    };
  }).filter(isUsableCandle).sort((a, b) => a.time - b.time);
}

function readAlphaNumber(row: Record<string, unknown>, field: string) {
  const entry = Object.entries(row || {}).find(([key]) => key.toLowerCase().includes(field));
  return entry ? toStrictNumber(entry[1]) : undefined;
}
