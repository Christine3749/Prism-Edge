import type {
  AnalysisRunResponse,
  Candle,
  MarketDataStatus,
  MarketSymbol,
  OrderBookItem,
  QuantBacktestReport,
  QuantHealth,
  QuantModelRegistry
} from "../../../shared/src/types";
import type { MarketTrade } from "../../../shared/src/mockMarketData";
import { AiAnalysisTab } from "./AiAnalysisTab";
import { BottomPanelTabs } from "./BottomPanelTabs";
import { ExecutionPortfolioWorkbench } from "./ExecutionPortfolioWorkbench";
import { MarketSignalMatrixWorkbench } from "./MarketSignalMatrixWorkbench";
import { NewsTab } from "./NewsTab";
import { OrderBookTab } from "./OrderBookTab";
import { ReservedBottomWorkbench } from "./ReservedBottomWorkbench";
import { TradesTab } from "./TradesTab";
import { TradingSignalsWorkbench } from "./TradingSignalsWorkbench";
import type { BottomPanelTab, MembershipNotice, QuantFeatureAccess, TranslationFn } from "./types";
import type { WorkspaceDeck } from "../SignalScanner";
import type { LayoutTier } from "../layoutTier";
import type { Language } from "../../../shared/src/translations";

interface BottomPanelShellProps {
  activeTab: BottomPanelTab;
  collapsed: boolean;
  orderBook: { bids: OrderBookItem[]; asks: OrderBookItem[] };
  trades: MarketTrade[];
  news: any[];
  newsLoading: boolean;
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  candles: Candle[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  aiAnalysis: string;
  aiLoading: boolean;
  analysisServiceFallback: boolean;
  quantHealth: QuantHealth | null;
  quantModels: QuantModelRegistry | null;
  backtest: QuantBacktestReport | null;
  backtestLoading: boolean;
  runtimeLoading: boolean;
  backtestError: string;
  membershipNotice: MembershipNotice | null;
  featureAccess: QuantFeatureAccess;
  lang: Language;
  t: TranslationFn;
  strategyMode: boolean;
  workspaceDeck: WorkspaceDeck | null;
  theme: "dark" | "light";
  tradingSignalsMode: boolean;
  matrixMode: boolean;
  executionMode: boolean;
  reservedMode: boolean;
  layoutTier: LayoutTier;
  onSelectTab: (tab: BottomPanelTab) => void;
  onToggleCollapsed: () => void;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  onRunAnalysis: () => void;
  onRunBacktest: () => void;
  onRunRuntime: () => void;
}

export function BottomPanelShell(props: BottomPanelShellProps) {
  const {
    activeTab,
    collapsed,
    orderBook,
    trades,
    news,
    newsLoading,
    currentSymbol,
    symbolsList,
    candles,
    marketStatus,
    analysisResult,
    aiAnalysis,
    aiLoading,
    analysisServiceFallback,
    quantHealth,
    quantModels,
    backtest,
    backtestLoading,
    runtimeLoading,
    backtestError,
    membershipNotice,
    featureAccess,
    lang,
    t,
    strategyMode,
    workspaceDeck,
    theme,
    tradingSignalsMode,
    matrixMode,
    executionMode,
    reservedMode,
    layoutTier,
    onSelectTab,
    onToggleCollapsed,
    onSymbolSelect,
    onRunAnalysis,
    onRunBacktest,
    onRunRuntime
  } = props;

  const visibleTab: BottomPanelTab = strategyMode ? "ai" : activeTab;
  const deckMode = tradingSignalsMode || matrixMode || executionMode || reservedMode;
  const ultraMode = layoutTier === "ultraportable" || layoutTier === "compact";
  const expandedStyle = deckMode
    ? layoutTier === "desktop"
      ? { height: "54vh", minHeight: 420, maxHeight: 620 }
      : ultraMode
        ? { height: "42vh", minHeight: 280, maxHeight: 340 }
        : { height: "44vh", minHeight: 320, maxHeight: 480 }
    : strategyMode
      ? layoutTier === "desktop"
        ? { height: "22vh", minHeight: 168, maxHeight: 236 }
        : ultraMode
          ? { height: "18vh", minHeight: 128, maxHeight: 160 }
          : { height: "20vh", minHeight: 144, maxHeight: 210 }
      : layoutTier === "desktop"
        ? { height: "24vh", minHeight: 128, maxHeight: 248 }
        : ultraMode
          ? { height: "20vh", minHeight: 108, maxHeight: 172 }
          : { height: "22vh", minHeight: 118, maxHeight: 212 };
  const shellTone = tradingSignalsMode || matrixMode || executionMode || reservedMode
    ? theme === "dark"
      ? "border-[#1e3a5f] bg-[#06111f] shadow-[0_-18px_56px_rgba(0,12,14,0.62),inset_0_1px_0_rgba(96,165,250,0.08)]"
      : "border-[#d9e5f0] bg-[#f7fbff] shadow-[0_-16px_44px_rgba(73,102,132,0.18),inset_0_1px_0_rgba(255,255,255,0.82)]"
    : strategyMode
      ? "border-[#1d4d6d] bg-[#000814] shadow-[0_-18px_56px_rgba(0,20,40,0.58),inset_0_1px_0_rgba(54,96,130,0.04)]"
      : "border-[#12324a] bg-[#000814]";

  return (
    <div
      className={`border-t flex flex-col justify-between shrink-0 z-30 transition-[height,min-height,max-height,border-color,background-color,box-shadow] duration-500 ease-out ${shellTone} ${collapsed ? "h-8" : ""}`}
      style={collapsed ? undefined : expandedStyle}
    >
      <BottomPanelTabs
        activeTab={visibleTab}
        collapsed={collapsed}
        marketStatus={marketStatus}
        lang={lang}
        t={t}
        onSelectTab={onSelectTab}
        onToggleCollapsed={onToggleCollapsed}
        strategyMode={strategyMode}
        workspaceDeck={workspaceDeck}
        theme={theme}
      />

      {!collapsed && (
        <div className={`flex-grow overflow-y-auto min-h-0 transition-[padding,background-color] duration-500 ${
          tradingSignalsMode || matrixMode || executionMode || reservedMode
            ? theme === "dark" ? "bg-[#06111f] p-0" : "bg-[#f7fbff] p-0"
            : strategyMode ? "bg-[#000814] p-0" : "bg-[#000814]/80 p-2"
        }`}>
          {visibleTab === "book" && <OrderBookTab orderBook={orderBook} currentSymbol={currentSymbol} />}
          {visibleTab === "trades" && <TradesTab trades={trades} currentSymbol={currentSymbol} />}
          {visibleTab === "news" && <NewsTab news={news} newsLoading={newsLoading} lang={lang} />}
          {visibleTab === "ai" && tradingSignalsMode && <TradingSignalsWorkbench currentSymbol={currentSymbol} candles={candles} marketStatus={marketStatus} analysisResult={analysisResult} lang={lang} theme={theme} />}
          {visibleTab === "ai" && matrixMode && <MarketSignalMatrixWorkbench currentSymbol={currentSymbol} symbolsList={symbolsList} marketStatus={marketStatus} lang={lang} theme={theme} onSymbolSelect={onSymbolSelect} />}
          {visibleTab === "ai" && executionMode && <ExecutionPortfolioWorkbench currentSymbol={currentSymbol} symbolsList={symbolsList} marketStatus={marketStatus} lang={lang} theme={theme} onSymbolSelect={onSymbolSelect} />}
          {visibleTab === "ai" && reservedMode && workspaceDeck !== null && <ReservedBottomWorkbench deck={workspaceDeck} lang={lang} theme={theme} />}
          {visibleTab === "ai" && !tradingSignalsMode && !matrixMode && !executionMode && !reservedMode && (
            <AiAnalysisTab
              currentSymbol={currentSymbol}
              candles={candles}
              marketStatus={marketStatus}
              aiAnalysis={aiAnalysis}
              aiLoading={aiLoading}
              analysisServiceFallback={analysisServiceFallback}
              analysisResult={analysisResult}
              quantHealth={quantHealth}
              quantModels={quantModels}
              backtest={backtest}
              backtestLoading={backtestLoading}
              runtimeLoading={runtimeLoading}
              backtestError={backtestError}
              membershipNotice={membershipNotice}
              featureAccess={featureAccess}
              lang={lang}
              onRunAnalysis={onRunAnalysis}
              onRunBacktest={onRunBacktest}
              onRunRuntime={onRunRuntime}
              strategyMode={strategyMode}
              news={news}
              newsLoading={newsLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}
