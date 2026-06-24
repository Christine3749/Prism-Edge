import type {
  NetRewardBreakdown,
  QuantDiagnostics,
  QuantRegime,
  TradePermission
} from "./quantTypes";

export type {
  DataLineage,
  QuantBacktestDecision,
  QuantBacktestReport,
  NetRewardBreakdown,
  QuantDecision,
  QuantDiagnostics,
  QuantHealth,
  QuantRegime,
  TradePermission,
  TradePermissionMode
} from "./quantTypes";

export interface MarketSymbol {
  id: string;
  symbol: string;
  name: string;
  type: "crypto" | "stock" | "forex";
  market?: "crypto" | "us" | "cn" | "hk" | "forex" | "internal";
  exchange?: string;
  currency?: string;
  dataProvider?: "binance" | "coinbase" | "yahoo" | "simulated" | "manual";
  yahooSymbol?: string;
  lastSource?: string;
  lastDataState?: MarketDataState;
  lastUpdatedAt?: number;
  price: number;
  change24h: number;
  volume24h: number;
  precision: number;
}

export type MarketDataState = "loading" | "live" | "delayed" | "simulated" | "stale" | "error";

export interface MarketDataStatus {
  state: MarketDataState;
  source: string;
  provider?: string;
  updatedAt?: number;
  latencyMs?: number;
  freshnessMs?: number;
  message?: string;
}

export interface MarketQuote {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  source: string;
  updatedAt: number;
  isLive: boolean;
}

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type AnalysisTrend = "bullish" | "bearish" | "neutral";

export type AnalysisSignalType = "buy" | "sell" | "watch";

export type AnalysisIndicator = "SMA" | "EMA" | "RSI" | "MACD" | "BOLLINGER";

export interface AnalysisSignal {
  type: AnalysisSignalType;
  time: number;
  price: number;
  label: string;
  confidence?: number;
}

export interface AnalysisLevels {
  support: number[];
  resistance: number[];
}

export interface AnalysisRunRequest {
  symbol: string;
  interval: string;
  candles: Candle[];
  indicators: AnalysisIndicator[];
}

export interface AnalysisRunResponse {
  trend: AnalysisTrend;
  regime?: QuantRegime;
  confidence: number;
  structuralError?: number;
  spectralGap?: number;
  bellmanResidual?: number;
  netReward?: NetRewardBreakdown;
  tradePermission?: TradePermission;
  diagnostics?: QuantDiagnostics;
  signals: AnalysisSignal[];
  levels: AnalysisLevels;
  summary: string;
  meta?: {
    engine: string;
    generatedAt: string;
    candleCount: number;
  };
}

export interface OrderBookItem {
  price: number;
  amount: number;
  total: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  sentiment: "bullish" | "bearish" | "neutral";
  summary: string;
  url: string;
}

export interface IndicatorConfig {
  sma: {
    active: boolean;
    period: number;
    color: string;
  };
  ema: {
    active: boolean;
    period: number;
    color: string;
  };
  bollinger: {
    active: boolean;
    period: number;
    multiplier: number;
    colorBasis: string;
    colorUpper: string;
    colorLower: string;
    colorFill: string;
  };
  rsi: {
    active: boolean;
    period: number;
    color: string;
    overbought: number;
    oversold: number;
  };
  macd: {
    active: boolean;
    fast: number;
    slow: number;
    signal: number;
    colorMacd: string;
    colorSignal: string;
    colorHistUp: string;
    colorHistDown: string;
  };
}

export type DrawingTool = "cursor" | "trendline" | "horizalline" | "ray" | "fibonacci" | "text" | "ruler";

export interface DrawingPoint {
  time: number; // Anchor timestamp
  price: number; // Anchor price
}

export interface Position {
  x: number;
  y: number;
}

export interface DrawingBase {
  id: string;
  type: DrawingTool;
  color: string;
  strokeWidth: number;
  points: DrawingPoint[]; // Point coordinates
  text?: string;
  isCompleted: boolean;
}

export interface AppSettings {
  theme: "dark" | "light";
  gridLines: boolean;
  solidBackground: boolean;
  upColor: string; // Dynamic candlestick colors
  downColor: string;
  timezone: string;
  useInternationalColor: boolean; // Chinese red-up/green-down vs International green-up/red-down
  autoSaveLayout: boolean;
}
