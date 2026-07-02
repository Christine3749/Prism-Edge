import type { ReactNode } from "react";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";

export type WorkspaceDeck = 1 | 2;

export interface SignalScannerProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  onHandleHoverChange?: (active: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
  activeWorkspaceDeck?: WorkspaceDeck | null;
  integratedBottom?: boolean;
  revealHandle?: boolean;
}

export interface IntelEvent {
  id: string;
  title: string;
  body: string;
  meta: string;
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
  icon: ReactNode;
  symbol?: MarketSymbol;
}

export interface StrategyLens {
  title: string;
  body: string;
  stage: string;
  score: number;
  direction: string;
  risk: string;
  execution: string;
  confidence: number;
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
}

export interface StrategySuggestion {
  id: string;
  title: string;
  body: string;
  meta: string;
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
  stars: number;
  icon: ReactNode;
}

export interface EvidenceItem {
  label: string;
  value: string;
  sub: string;
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
  width: number;
}

export interface IntelStats {
  defense: number;
  feedIssues: number;
}
