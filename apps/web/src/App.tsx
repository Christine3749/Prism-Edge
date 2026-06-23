import React, { useState, useEffect, useRef } from "react";
import { 
  MarketSymbol, Candle, IndicatorConfig, DrawingTool, DrawingBase, AppSettings 
} from "@shared/types";
import { 
  DEFAULT_SYMBOLS, simulateNextTick 
} from "@shared/mockMarketData";
import { loadMarketData, subscribeRealtime } from "@shared/marketDataService";
import { StorageService } from "@shared/storage";

import Header from "@ui/Header";
import DrawingToolbar from "@ui/DrawingToolbar";
import Watchlist from "@ui/Watchlist";
import ChartContainer from "@ui/ChartContainer";
import BottomPanel from "@ui/BottomPanel";
import IndicatorsModal from "@ui/IndicatorsModal";
import SettingsModal from "@ui/SettingsModal";
import { Language, useTranslation } from "@shared/translations";

const DEFAULT_INDICATOR_CONFIG: IndicatorConfig = {
  sma: { active: true, period: 20, color: "#22d3ee" }, // cyan accent
  ema: { active: false, period: 50, color: "#3b82f6" },
  bollinger: { 
    active: false, 
    period: 20, 
    multiplier: 2, 
    colorBasis: "#6366f1", 
    colorUpper: "#818cf8", 
    colorLower: "#818cf8",
    colorFill: "rgba(99, 102, 241, 0.05)"
  },
  rsi: { active: false, period: 14, color: "#ec4899", overbought: 70, oversold: 30 },
  macd: { 
    active: false, 
    fast: 12, 
    slow: 26, 
    signal: 9, 
    colorMacd: "#38bdf8", 
    colorSignal: "#f472b6", 
    colorHistUp: "#10b981", 
    colorHistDown: "#ef4444" 
  }
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: "dark",
  gridLines: true,
  solidBackground: false,
  upColor: "#10b981", // green up
  downColor: "#ef4444", // red down
  timezone: "Etc/UTC",
  useInternationalColor: true,
  autoSaveLayout: true
};

export default function App() {
  // Sync load from cache
  const [currentSymbol, setCurrentSymbol] = useState<MarketSymbol>(() => {
    const list = StorageService.loadWatchlist(DEFAULT_SYMBOLS);
    return list[0] || DEFAULT_SYMBOLS[0];
  });
  
  const [symbolsList, setSymbolsList] = useState<MarketSymbol[]>(() => {
    return StorageService.loadWatchlist(DEFAULT_SYMBOLS);
  });
  
  const [candles, setCandles] = useState<Candle[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>("cursor");
  const [drawings, setDrawings] = useState<DrawingBase[]>(() => {
    return StorageService.loadDrawings([]);
  });
  
  const [indicatorConfig, setIndicatorConfig] = useState<IndicatorConfig>(() => {
    return StorageService.loadIndicators(DEFAULT_INDICATOR_CONFIG);
  });
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    return StorageService.loadSettings(DEFAULT_APP_SETTINGS);
  });
  
  const [workspaceSaved, setWorkspaceSaved] = useState(false);
  const [isLiveBinanceActive, setIsLiveBinanceActive] = useState(false);
  
  const [timeframe, setTimeframe] = useState("1D");
  const [chartType, setChartType] = useState("candlestick");

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem("prism_edge_lang") as Language) || "zh";
  });
  const t = useTranslation(lang);

  useEffect(() => {
    localStorage.setItem("prism_edge_lang", lang);
  }, [lang]);

  const [indicatorsModalOpen, setIndicatorsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const wsRef = useRef<WebSocket | null>(null);

  // Sync state modifications to Watchlist Storage
  useEffect(() => {
    StorageService.saveWatchlist(symbolsList);
  }, [symbolsList]);

  // Handle auto-save trigger based on setting preference
  useEffect(() => {
    if (settings.autoSaveLayout) {
      StorageService.saveDrawings(drawings);
    }
  }, [drawings, settings.autoSaveLayout]);

  useEffect(() => {
    if (settings.autoSaveLayout) {
      StorageService.saveIndicators(indicatorConfig);
    }
  }, [indicatorConfig, settings.autoSaveLayout]);

  useEffect(() => {
    if (settings.autoSaveLayout) {
      StorageService.saveSettings(settings);
    }
  }, [settings, settings.autoSaveLayout]);

  // Sync pricing in our local lists
  const updateSymbolsListPrice = (symbolId: string, nextPrice: number) => {
    setSymbolsList((prev) => 
      prev.map((sym) => {
        if (sym.id === symbolId) {
          const firstPrice = sym.price - (sym.price * (sym.change24h / 100));
          const diff = nextPrice - firstPrice;
          const nextChange = firstPrice !== 0 ? (diff / firstPrice) * 100 : 0;
          return {
            ...sym,
            price: Number(nextPrice.toFixed(sym.precision)),
            change24h: Number(nextChange.toFixed(2))
          };
        }
        return sym;
      })
    );
  };

  // Load historical candle data
  useEffect(() => {
    const fetchHistory = async () => {
      setCandles([]);
      setIsLiveBinanceActive(false);

      const result = await loadMarketData(currentSymbol, timeframe);
      setCandles(result.candles);
      setIsLiveBinanceActive(result.isLiveBinance);
    };

    fetchHistory();
  }, [currentSymbol, timeframe]);

  // Bind live spot updating ticking streams
  useEffect(() => {
    if (candles.length === 0) return;

    const subscription = subscribeRealtime(currentSymbol, timeframe, (tick) => {
      updateSymbolsListPrice(currentSymbol.id, tick.close);

      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;
        
        const lastCandle = prevCandles[prevCandles.length - 1];
        const candleTime = tick.time;

        const updatedCandle: Candle = {
          time: candleTime,
          open: tick.open,
          high: tick.high,
          low: tick.low,
          close: tick.close,
          volume: tick.volume
        };

        if (candleTime > lastCandle.time) {
          return [...prevCandles.slice(1), updatedCandle];
        } else {
          return [...prevCandles.slice(0, -1), updatedCandle];
        }
      });
    });

    return () => {
      subscription.close();
    };
  }, [currentSymbol, timeframe, candles.length]);

  const handleSaveWorkspace = () => {
    StorageService.saveDrawings(drawings);
    StorageService.saveIndicators(indicatorConfig);
    StorageService.saveSettings(settings);
    StorageService.saveWatchlist(symbolsList);

    setWorkspaceSaved(true);
    setTimeout(() => setWorkspaceSaved(false), 2000);
  };

  const handleResetLayout = () => {
    setResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    StorageService.clearAll();
    setDrawings([]);
    setIndicatorConfig(DEFAULT_INDICATOR_CONFIG);
    setSettings(DEFAULT_APP_SETTINGS);
    setSymbolsList(DEFAULT_SYMBOLS);
    setCurrentSymbol(DEFAULT_SYMBOLS[0]);
    setTimeframe("1D");
    setChartType("candlestick");
    setResetConfirmOpen(false);
    showToast(t("toastResetSuccess"));
  };

  const handleTakeScreenshot = () => {
    showToast(t("toastScreenshot"));
  };

  // Synchronous light theme adaptations
  const activeClass = settings.theme === "light" ? "bg-slate-50 text-slate-900 border-slate-200" : "bg-slate-950 text-slate-100 border-slate-900";

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans transition-colors duration-200 ${activeClass}`}>
      
      {/* 1. Header Toolbar */}
      <Header
        currentSymbol={currentSymbol}
        onSymbolSelect={setCurrentSymbol}
        currentTimeframe={timeframe}
        onTimeframeSelect={setTimeframe}
        chartType={chartType}
        onChartTypeSelect={setChartType}
        settings={settings}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenIndicators={() => setIndicatorsModalOpen(true)}
        onSaveWorkspace={handleSaveWorkspace}
        workspaceSaved={workspaceSaved}
        onResetLayout={handleResetLayout}
        onTakeScreenshot={handleTakeScreenshot}
        isLiveBinanceActive={isLiveBinanceActive}
        lang={lang}
        onLangChange={setLang}
      />

      {/* 2. Main Terminal Grid Area */}
      <div className="flex-grow flex min-h-0 relative select-none">
        
        {/* Left Toolbar */}
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onClearDrawings={() => setDrawings([])}
          drawingsCount={drawings.length}
          lang={lang}
        />

        {/* Outer view wrap */}
        <div className="flex-grow flex flex-col min-w-0 h-full">
          {/* Main Chart viewport */}
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
          />

          {/* Bottom Foldable panel */}
          <BottomPanel
            currentSymbol={currentSymbol}
            candles={candles}
            activeIndicators={indicatorConfig}
            timeframe={timeframe}
            lang={lang}
          />
        </div>

        {/* Right Watchlist list panel */}
        <Watchlist
          currentSymbol={currentSymbol}
          onSymbolSelect={setCurrentSymbol}
          symbolsList={symbolsList}
          lang={lang}
        />
      </div>

      {/* 3. Overlays / Drawers Modals */}
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

      {/* 4. Elegant Custom Confirmation Modal for resetting workspace */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[90%] max-w-md bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              {t("resetTitle")}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              {t("resetContent")}
            </p>
            <div className="flex items-center justify-end gap-3 font-semibold text-xs text-slate-200">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-755 border border-slate-700/80 hover:text-white rounded transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors cursor-pointer"
              >
                {t("confirmResetBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Ambient non-blocking toast banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 bg-slate-900 border border-cyan-500/40 rounded-lg shadow-2xl text-xs text-cyan-400 select-none animate-in slide-in-from-bottom-4 duration-200">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="font-medium text-slate-100">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
