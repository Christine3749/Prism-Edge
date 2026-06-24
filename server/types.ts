import type { MarketSymbol } from "../packages/shared/src/types";

export type Trend = "bullish" | "bearish" | "neutral";
export type SignalType = "buy" | "sell" | "watch";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalysisBody {
  symbol?: string;
  interval?: string;
  timeframe?: string;
  candles?: Candle[];
  indicators?: unknown;
}

export interface MarketQuotePayload {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  source: string;
  updatedAt: number;
  isLive: boolean;
}

export interface YahooChartPayload {
  candles: Candle[];
  source: string;
  quote?: MarketQuotePayload;
}

export interface KlinePayload {
  symbol: string;
  interval: string;
  source: string;
  updatedAt: number;
  isLive: boolean;
  candles: Candle[];
}

export interface QuotePayload {
  quotes: MarketQuotePayload[];
  updatedAt: number;
  fallback?: boolean;
}

export type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

export type CoinbaseCandle = [number, number, number, number, number, number];
export type MarketSearchItem = MarketSymbol;
