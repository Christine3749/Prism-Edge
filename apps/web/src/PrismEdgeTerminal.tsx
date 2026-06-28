import { useState } from "react";
import { DEFAULT_WATCHLIST_SYMBOLS } from "@shared/marketCatalog";
import { StorageService } from "@shared/storage";
import { useTranslation } from "@shared/translations";
import type { AnalysisRunResponse, AppSettings, Candle, DrawingBase, DrawingTool, IndicatorConfig, MarketDataStatus, MarketSymbol } from "@shared/types";
import BottomPanel from "@ui/BottomPanel";
import ChartContainer from "@ui/ChartContainer";
import DrawingToolbar from "@ui/DrawingToolbar";
import Header from "@ui/Header";
import IndicatorsModal from "@ui/IndicatorsModal";
import SignalScanner from "@ui/SignalScanner";
import SettingsModal from "@ui/SettingsModal";
import Watchlist from "@ui/Watchlist";
import { DEFAULT_APP_SETTINGS, DEFAULT_INDICATOR_CONFIG } from "./config/appDefaults";
import { ResetConfirmModal } from "./components/ResetConfirmModal";
import { ToastBanner } from "./components/ToastBanner";
import { useAnalysisRunner } from "./hooks/useAnalysisRunner";
import { useLanguagePreference } from "./hooks/useLanguagePreference";
import { useLayoutPersistence } from "./hooks/useLayoutPersistence";
import { useMarketRuntime } from "./hooks/useMarketRuntime";
import { useToast } from "./hooks/useToast";
import { enrichMarketSymbol, loadHydratedWatchlist, stripVolatileSymbolFields } from "./services/watchlistStorage";

export default function PrismEdgeTerminal() {
  const [currentSymbol, setCurrentSymbol] = useState<MarketSymbol>(() => loadHydratedWatchlist()[0] || DEFAULT_WATCHLIST_SYMBOLS[0]);
  const [symbolsList, setSymbolsList] = useState<MarketSymbol[]>(() => loadHydratedWatchlist());
  const [candles, setCandles] = useState<Candle[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>("cursor");
  const [drawings, setDrawings] = useState<DrawingBase[]>(() => StorageService.loadDrawings([]));
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig>(() => StorageService.loadIndicators(DEFAULT_INDICATOR_CONFIG));
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.loadSettings(DEFAULT_APP_SETTINGS));
  const [workspaceSaved, setWorkspaceSaved] = useState(false);
  const [isLiveBinanceActive, setIsLiveBinanceActive] = useState(false);
  const [marketStatus, setMarketStatus] = useState<MarketDataStatus>({
    state: "loading",
    source: "initializing",
    message: "Preparing market data gateway."
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisRunResponse | null>(null);
  const [timeframe, setTimeframe] = useState("1D");
  const [chartType, setChartType] = useState("candlestick");
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [scannerHandleActive, setScannerHandleActive] = useState(false);
  const [indicatorsModalOpen, setIndicatorsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [lang, setLang] = useLanguagePreference();
  const t = useTranslation(lang);
  const { toastMessage, showToast } = useToast();

  useLayoutPersistence({ drawings, indicatorConfig, settings, symbolsList });
  useAnalysisRunner({ candles, currentSymbol, timeframe, indicatorConfig, setAnalysisResult });
  useMarketRuntime({
    candles,
    currentSymbol,
    timeframe,
    symbolsList,
    marketStatus,
    setCandles,
    setCurrentSymbol,
    setSymbolsList,
    setMarketStatus,
    setIsLiveBinanceActive,
    setAnalysisResult
  });

  const handleSymbolSelect = (symbol: MarketSymbol) => {
    const hydrated = enrichMarketSymbol(symbol);
    setCurrentSymbol(hydrated);
    setSymbolsList((prev) => {
      if (prev.some((item) => item.symbol === hydrated.symbol)) return prev;
      return [hydrated, ...prev].slice(0, 60);
    });
  };

  const handleSaveWorkspace = () => {
    StorageService.saveDrawings(drawings);
    StorageService.saveIndicators(indicatorConfig);
    StorageService.saveSettings(settings);
    StorageService.saveWatchlist(symbolsList.map(stripVolatileSymbolFields));
    setWorkspaceSaved(true);
    window.setTimeout(() => setWorkspaceSaved(false), 2000);
  };

  const handleConfirmReset = () => {
    StorageService.clearAll();
    setDrawings([]);
    setIndicatorConfig(DEFAULT_INDICATOR_CONFIG);
    setSettings(DEFAULT_APP_SETTINGS);
    setSymbolsList(DEFAULT_WATCHLIST_SYMBOLS.map((symbol) => ({ ...symbol })));
    setCurrentSymbol({ ...DEFAULT_WATCHLIST_SYMBOLS[0] });
    setTimeframe("1D");
    setChartType("candlestick");
    setResetConfirmOpen(false);
    showToast(t("toastResetSuccess"));
  };

  const activeClass = settings.theme === "light"
    ? "bg-slate-50 text-slate-900 border-slate-200"
    : "bg-slate-950 text-slate-100 border-slate-900";

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans transition-colors duration-200 ${activeClass}`}>
      <Header
        currentSymbol={currentSymbol}
        onSymbolSelect={handleSymbolSelect}
        currentTimeframe={timeframe}
        onTimeframeSelect={setTimeframe}
        chartType={chartType}
        onChartTypeSelect={setChartType}
        settings={settings}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenIndicators={() => setIndicatorsModalOpen(true)}
        onSaveWorkspace={handleSaveWorkspace}
        workspaceSaved={workspaceSaved}
        onResetLayout={() => setResetConfirmOpen(true)}
        onTakeScreenshot={() => showToast(t("toastScreenshot"))}
        isLiveBinanceActive={isLiveBinanceActive}
        marketStatus={marketStatus}
        lang={lang}
        onLangChange={setLang}
        onToggleWatchlist={() => setWatchlistOpen((open) => !open)}
      />

      <div className="flex-grow flex min-h-0 relative select-none">
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onClearDrawings={() => setDrawings([])}
          drawingsCount={drawings.length}
          lang={lang}
        />


        <SignalScanner
          currentSymbol={currentSymbol}
          symbolsList={symbolsList}
          marketStatus={marketStatus}
          analysisResult={analysisResult}
          lang={lang}
          onSymbolSelect={handleSymbolSelect}
          onHandleHoverChange={setScannerHandleActive}
        />
        <div className="flex-grow flex flex-col min-w-0 h-full">
          <ChartContainer
            currentSymbol={currentSymbol}
            candles={candles}
            indicatorConfig={indicatorConfig}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            drawings={drawings}
            onUpdateDrawings={setDrawings}
            settings={settings}
            currentTimeframe={timeframe}
            chartType={chartType}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            scannerHandleActive={scannerHandleActive}
          />
          <BottomPanel
            currentSymbol={currentSymbol}
            candles={candles}
            activeIndicators={indicatorConfig}
            timeframe={timeframe}
            lang={lang}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            onAnalysisResult={setAnalysisResult}
          />
        </div>

        <Watchlist
          currentSymbol={currentSymbol}
          onSymbolSelect={handleSymbolSelect}
          symbolsList={symbolsList}
          lang={lang}
          marketStatus={marketStatus}
          isOpen={watchlistOpen}
          onClose={() => setWatchlistOpen(false)}
        />
      </div>

      <IndicatorsModal
        isOpen={indicatorsModalOpen}
        onClose={() => setIndicatorsModalOpen(false)}
        config={indicatorConfig}
        onUpdateConfig={setIndicatorConfig}
      />
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
      {resetConfirmOpen && (
        <ResetConfirmModal
          t={t}
          onCancel={() => setResetConfirmOpen(false)}
          onConfirm={handleConfirmReset}
        />
      )}
      {toastMessage && <ToastBanner message={toastMessage} />}
    </div>
  );
}
