import type { AnalysisRunResponse, Candle, IndicatorConfig, MarketDataStatus, MarketSymbol } from "../../../shared/src/types";
import type { Language } from "../../../shared/src/translations";
import type { WorkspaceDeck } from "../SignalScanner";
import type { LayoutTier } from "../layoutTier";

export interface BottomPanelProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  onSymbolSelect: (symbol: MarketSymbol) => void;
  candles: Candle[];
  activeIndicators: IndicatorConfig;
  timeframe: string;
  lang: Language;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  onAnalysisResult?: (result: AnalysisRunResponse | null) => void;
  strategyMode?: boolean;
  workspaceDeck?: WorkspaceDeck | null;
  theme?: "dark" | "light";
  layoutTier?: LayoutTier;
}
