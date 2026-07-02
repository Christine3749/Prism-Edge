import { ALPHA_VANTAGE_API_KEY, FINNHUB_API_KEY, POLYGON_API_KEY, TWELVE_DATA_API_KEY } from "./config";

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

export { fetchBinanceKlines, fetchBinanceQuote, fetchCoinbaseKlines, fetchCoinbaseQuote } from "./marketProviderCrypto";
export { fetchAlphaVantageChart, fetchAlphaVantageQuote, fetchFinnhubChart, fetchFinnhubQuote, fetchPolygonChart, fetchPolygonQuote, fetchTwelveDataChart, fetchTwelveDataQuote } from "./marketProviderPremium";
export { fetchYahooChart, fetchYahooQuote, fetchYahooQuoteBatch, fetchYahooSearch } from "./marketProviderYahoo";