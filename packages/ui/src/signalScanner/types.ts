import type { ReactNode } from "react";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import type { LayoutTier } from "../layoutTier";

export type WorkspaceDeck = 1 | 2 | 3 | 4 | 5 | 6;

export interface SignalScannerProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  activeWorkspaceDeck?: WorkspaceDeck | null;
  integratedBottom?: boolean;
  theme?: "dark" | "light";
  layoutTier?: LayoutTier;
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
