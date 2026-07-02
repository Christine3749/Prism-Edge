import { inferMarketSymbolFromInput, resolveMarketSymbol } from "../packages/shared/src/marketCatalog";
import { ALPHA_VANTAGE_API_KEY, FINNHUB_API_KEY, POLYGON_API_KEY, TWELVE_DATA_API_KEY } from "./config";
import { normalizeMarketSymbol } from "./marketFormat";
import type { YahooChartPayload, MarketQuotePayload } from "./types";
import {
  buildChartPayload,
  buildQuotePayload,
  fetchAlphaVantageCryptoSeries,
  fetchAlphaVantageForexSeries,
  fetchAlphaVantageStockSeries,
  fetchJson,
  isCryptoLike,
  isForexLike,
  isUsableCandle,
  lookbackSecondsFor,
  parseAlphaTimeSeries,
  parseProviderTime,
  providerRawLimitForInterval,
  splitCryptoPair,
  splitForexPair,
  toDateOnly,
  toFinnhubResolution,
  toFinnhubSymbol,
  toPolygonRange,
  toPolygonTicker,
  toTwelveDataInterval,
  toTwelveDataSymbol
} from "./marketProviderUtils";

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
  })).filter(isUsableCandle).slice(-providerRawLimitForInterval(interval, limit));

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
  const candles = parseAlphaTimeSeries(data).slice(-providerRawLimitForInterval(interval, limit));
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





