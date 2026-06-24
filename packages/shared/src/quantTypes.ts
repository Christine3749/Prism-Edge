export type QuantRegime = "trend" | "range" | "breakout" | "stress" | "transition";

export type TradePermissionMode =
  | "attack"
  | "defensive"
  | "reduce_only"
  | "hedge_only"
  | "reject"
  | "manual_review";

export interface NetRewardBreakdown {
  mean: number;
  cvar: number;
  grossPnl: number;
  costPenalty: number;
  riskPenalty: number;
  uncertaintyPenalty: number;
}

export interface TradePermission {
  allowed: boolean;
  mode: TradePermissionMode;
  reasons: string[];
  diagnostics: Record<string, number>;
}

export interface QuantDiagnostics {
  score: number;
  momentum: number;
  emaSpread: number;
  rsi: number;
  atrPct: number;
  volumeRatio: number;
}

export interface DataLineage {
  source: string;
  provider: string;
  updatedAt: number;
  isLive: boolean;
  isDelayed: boolean;
  isSynthetic: boolean;
  latencyMs?: number;
}

export interface QuantDecision {
  model: string;
  regime: QuantRegime;
  confidence: number;
  structuralError: number;
  spectralGap: number;
  bellmanResidual: number;
  netReward: NetRewardBreakdown;
  tradePermission: TradePermission;
  diagnostics: QuantDiagnostics;
  lineage?: DataLineage;
}

export interface QuantHealth {
  adapter: string;
  root: string;
  exists: boolean;
  importable: boolean;
  files: Record<string, boolean>;
}

export interface QuantBacktestDecision {
  time: number;
  mode: TradePermissionMode;
  allowed: boolean;
  netReward: number;
  regime: QuantRegime;
}

export interface QuantBacktestReport {
  schema: string;
  adapter: string;
  symbol: string;
  interval: string;
  sampleCount: number;
  acceptedSignals: number;
  rejectedSignals: number;
  cumulativeReturn: number;
  maxDrawdown: number;
  decisions: QuantBacktestDecision[];
  serviceFallback?: boolean;
}
