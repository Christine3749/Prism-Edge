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


export type QuantModelStatus = "ready" | "degraded" | "missing";

export type QuantModelKind = "dgwm" | "pytorch_head" | "baseline" | "unknown";

export interface QuantModelEntry {
  id: string;
  name: string;
  kind: QuantModelKind | string;
  role: string;
  root: string;
  exists: boolean;
  status: QuantModelStatus;
  version: string;
  gitCommit: string;
  dirty: boolean;
  python: string;
  pythonExists: boolean;
  importModule: string;
  importable: boolean | null;
  importError: string;
  files: Record<string, boolean>;
  capabilities: string[];
  notes: string[];
}

export interface QuantModelRegistry {
  schema: string;
  generatedAt: string;
  baseRoot: string;
  defaultModelId: string;
  models: QuantModelEntry[];
}
export interface QuantHealth {
  adapter: string;
  root: string;
  exists: boolean;
  importable: boolean;
  files: Record<string, boolean>;
  runtime?: {
    python: string;
    pythonExists: boolean;
    registryImportable: boolean;
  };
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

export interface QuantRuntimeDiagnostic {
  accepted: boolean;
  exitCode: number;
  elapsedMs: number;
  metrics: Record<string, unknown>;
  failure: Record<string, unknown>;
  universe?: {
    primarySymbol?: string;
    symbols?: string[];
    rowCount?: number;
    targetBars?: number;
    source?: string;
    syntheticSymbols?: string[];
    realSymbols?: string[];
  };
  files: Record<string, string>;
}
