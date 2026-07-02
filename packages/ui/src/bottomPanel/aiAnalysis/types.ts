import type { AnalysisRunResponse, Candle, MarketDataStatus, MarketSymbol, NewsItem, QuantBacktestReport, QuantHealth, QuantModelRegistry } from "@shared/types";
import type { Language } from "@shared/translations";
import type { MembershipNotice, QuantFeatureAccess } from "../types";

export interface AiAnalysisTabProps {
  currentSymbol: MarketSymbol;
  candles: Candle[];
  marketStatus?: MarketDataStatus;
  aiAnalysis: string;
  aiLoading: boolean;
  analysisServiceFallback: boolean;
  analysisResult?: AnalysisRunResponse | null;
  quantHealth: QuantHealth | null;
  quantModels: QuantModelRegistry | null;
  backtest: QuantBacktestReport | null;
  backtestLoading: boolean;
  runtimeLoading: boolean;
  backtestError: string;
  membershipNotice?: MembershipNotice | null;
  featureAccess?: QuantFeatureAccess;
  lang: Language;
  onRunAnalysis: () => void;
  onRunBacktest: () => void;
  onRunRuntime: () => void;
  strategyMode?: boolean;
  news?: NewsItem[];
  newsLoading?: boolean;
}