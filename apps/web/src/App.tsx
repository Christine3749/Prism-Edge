import React, { useState, useEffect, useRef } from "react";
import { 
  MarketSymbol, Candle, IndicatorConfig, DrawingTool, DrawingBase, AppSettings,
  MarketDataStatus, AnalysisRunResponse, MarketQuote, AnalysisIndicator
} from "@shared/types";
import { 
  DEFAULT_SYMBOLS, timeframeToSeconds
} from "@shared/mockMarketData";
import { resolveMarketSymbol } from "@shared/marketCatalog";
import { fetchMarketQuotes, loadMarketData, subscribeRealtime } from "@shared/marketDataService";
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

function enrichMarketSymbol(symbol: MarketSymbol): MarketSymbol {
  const catalogSymbol = resolveMarketSymbol(symbol.symbol) || resolveMarketSymbol(symbol.id);
  if (!catalogSymbol) return symbol;
  return {
    ...catalogSymbol,
    ...symbol,
    market: symbol.market || catalogSymbol.market,
    exchange: symbol.exchange || catalogSymbol.exchange,
    currency: symbol.currency || catalogSymbol.currency,
    dataProvider: symbol.dataProvider || catalogSymbol.dataProvider,
    yahooSymbol: symbol.yahooSymbol || catalogSymbol.yahooSymbol
  };
}

function loadHydratedWatchlist() {
  return StorageService.loadWatchlist(DEFAULT_SYMBOLS).map(enrichMarketSymbol);
}

export default function App() {
  // Sync load from cache
  const [currentSymbol, setCurrentSymbol] = useState<MarketSymbol>(() => {
    const list = loadHydratedWatchlist();
    return list[0] || DEFAULT_SYMBOLS[0];
  });
  
  const [symbolsList, setSymbolsList] = useState<MarketSymbol[]>(() => {
    return loadHydratedWatchlist();
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
  const [marketStatus, setMarketStatus] = useState<MarketDataStatus>({
    state: "loading",
    source: "initializing",
    message: "Preparing market data gateway."
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisRunResponse | null>(null);
  
  const [timeframe, setTimeframe] = useState("1D");
  const [chartType, setChartType] = useState("candlestick");
  const [watchlistOpen, setWatchlistOpen] = useState(false);

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
  const symbolsListRef = useRef(symbolsList);
  const lastMarketUpdateRef = useRef(Date.now());

  useEffect(() => {
    symbolsListRef.current = symbolsList;
  }, [symbolsList]);

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
  const updateSymbolsListPrice = (
    symbolId: string,
    nextPrice: number,
    feed?: { source: string; state: MarketDataStatus["state"]; updatedAt: number }
  ) => {
    const applyPrice = (sym: MarketSymbol): MarketSymbol => {
      const firstPrice = sym.price - (sym.price * (sym.change24h / 100));
      const diff = nextPrice - firstPrice;
      const nextChange = firstPrice !== 0 ? (diff / firstPrice) * 100 : 0;
      return {
        ...sym,
        price: Number(nextPrice.toFixed(sym.precision)),
        change24h: Number(nextChange.toFixed(2)),
        lastSource: feed?.source || sym.lastSource,
        lastDataState: feed?.state || sym.lastDataState,
        lastUpdatedAt: feed?.updatedAt || sym.lastUpdatedAt
      };
    };

    setSymbolsList((prev) => 
      prev.map((sym) => {
        if (sym.id === symbolId) {
          return applyPrice(sym);
        }
        return sym;
      })
    );

    setCurrentSymbol((prev) => {
      if (prev.id !== symbolId) return prev;
      return applyPrice(prev);
    });
  };

  const applyQuote = (quote: MarketQuote) => {
    const state = getFeedState(quote.source, quote.isLive);
    const applyToSymbol = (sym: MarketSymbol): MarketSymbol => ({
      ...sym,
      price: Number(quote.price.toFixed(sym.precision)),
      change24h: Number(quote.change24h.toFixed(2)),
      volume24h: Math.round(quote.volume24h),
      lastSource: quote.source,
      lastDataState: state,
      lastUpdatedAt: quote.updatedAt
    });

    setSymbolsList((prev) => prev.map((sym) => (
      sym.symbol === quote.symbol ? applyToSymbol(sym) : sym
    )));

    setCurrentSymbol((prev) => (
      prev.symbol === quote.symbol ? applyToSymbol(prev) : prev
    ));
  };

  const buildActiveIndicatorList = (): AnalysisIndicator[] => {
    const enabled: AnalysisIndicator[] = [];
    if (indicatorConfig.sma.active) enabled.push("SMA");
    if (indicatorConfig.ema.active) enabled.push("EMA");
    if (indicatorConfig.rsi.active) enabled.push("RSI");
    if (indicatorConfig.macd.active) enabled.push("MACD");
    if (indicatorConfig.bollinger.active) enabled.push("BOLLINGER");
    return enabled;
  };

  const getFeedState = (source: string, isLive: boolean): MarketDataStatus["state"] => {
    if (isLive) return "live";
    if (source.toLowerCase().includes("yahoo")) return "delayed";
    return "simulated";
  };

  const handleSymbolSelect = (symbol: MarketSymbol) => {
    const hydrated = enrichMarketSymbol(symbol);
    setCurrentSymbol(hydrated);
    setSymbolsList((prev) => {
      if (prev.some((item) => item.symbol === hydrated.symbol)) return prev;
      return [hydrated, ...prev].slice(0, 60);
    });
  };

  const refreshQuotes = async (quiet = false) => {
    try {
      const quotes = await fetchMarketQuotes(symbolsListRef.current);
      quotes.forEach(applyQuote);

      const activeQuote = quotes.find((quote) => quote.symbol === currentSymbol.symbol);
      if (activeQuote) {
        const state = getFeedState(activeQuote.source, activeQuote.isLive);
        lastMarketUpdateRef.current = activeQuote.updatedAt || Date.now();
        setIsLiveBinanceActive(activeQuote.isLive);
        setMarketStatus({
          state,
          source: activeQuote.source,
          updatedAt: lastMarketUpdateRef.current,
          message: activeQuote.isLive
            ? "Real market quote stream."
            : state === "delayed"
              ? "Delayed market quote from public market provider."
              : "Fallback simulated quote."
        });
      }
    } catch (err) {
      if (!quiet) {
        setMarketStatus({
          state: "error",
          source: marketStatus.source || "gateway",
          updatedAt: lastMarketUpdateRef.current,
          message: err instanceof Error ? err.message : "Quote gateway unavailable."
        });
      }
    }
  };

  // Load historical candle data
  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setCandles([]);
      setIsLiveBinanceActive(false);
      setAnalysisResult(null);
      setMarketStatus({
        state: "loading",
        source: "gateway",
        message: `Loading ${currentSymbol.id} ${timeframe} candles.`
      });

      const result = await loadMarketData(currentSymbol, timeframe);
      if (cancelled) return;

      setCandles(result.candles);
      setIsLiveBinanceActive(result.isLiveBinance);
      lastMarketUpdateRef.current = result.updatedAt;
      const state = getFeedState(result.source, result.isLiveBinance);
      setMarketStatus({
        state,
        source: result.source,
        updatedAt: result.updatedAt,
        message: result.isLiveBinance
          ? "Real candle gateway connected."
          : state === "delayed"
            ? "Delayed candle gateway connected."
            : "Fallback simulator active."
      });
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [currentSymbol.id, timeframe]);

  useEffect(() => {
    refreshQuotes(true);
    const timer = setInterval(() => refreshQuotes(true), 5000);

    const refreshOnFocus = () => refreshQuotes(true);
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("online", refreshOnFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("online", refreshOnFocus);
    };
  }, [currentSymbol.symbol]);

  useEffect(() => {
    if (candles.length < 30) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/analysis/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: currentSymbol.id,
            interval: timeframe,
            candles,
            indicators: buildActiveIndicatorList()
          }),
          signal: controller.signal
        });

        if (!response.ok) return;
        const data = await response.json() as AnalysisRunResponse;
        setAnalysisResult(data);
      } catch {
        if (!controller.signal.aborted) {
          setAnalysisResult(null);
        }
      }
    }, 650);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [currentSymbol.id, timeframe, candles.length, indicatorConfig.sma.active, indicatorConfig.ema.active, indicatorConfig.rsi.active, indicatorConfig.macd.active, indicatorConfig.bollinger.active]);

  useEffect(() => {
    const timer = setInterval(() => {
      const ageMs = Date.now() - lastMarketUpdateRef.current;
      setMarketStatus((prev) => {
        if (prev.state === "loading" || prev.state === "error") return prev;
        if (ageMs <= 22000) return prev;
        return {
          ...prev,
          state: "stale",
          message: `Market data delayed by ${Math.round(ageMs / 1000)}s.`
        };
      });
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Bind live spot updating ticking streams
  useEffect(() => {
    if (candles.length === 0) return;

    const subscription = subscribeRealtime(currentSymbol, timeframe, (tick) => {
      lastMarketUpdateRef.current = Date.now();
      const source = tick.source || (tick.isLive ? marketStatus.source : "simulated");
      const state = getFeedState(source, tick.isLive);
      updateSymbolsListPrice(currentSymbol.id, tick.close, {
        source,
        state,
        updatedAt: lastMarketUpdateRef.current
      });
      setMarketStatus((prev) => ({
        state,
        source: tick.source || (tick.isLive ? (prev.source === "simulated" ? "binance" : prev.source) : "simulated"),
        updatedAt: lastMarketUpdateRef.current,
        message: tick.isLive
          ? "Realtime candle gateway connected."
          : state === "delayed"
            ? "Delayed candle gateway connected."
            : "Fallback simulator active."
      }));

      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;
        
        const lastCandle = prevCandles[prevCandles.length - 1];
        const secStep = timeframeToSeconds(timeframe);
        const candleTime = Math.floor(tick.time / secStep) * secStep;
        const close = Number(tick.close.toFixed(currentSymbol.precision));

        if (candleTime > lastCandle.time) {
          const open = tick.isLive ? tick.open : lastCandle.close;
          const updatedCandle: Candle = {
            time: candleTime,
            open,
            high: Number(Math.max(open, tick.high, close).toFixed(currentSymbol.precision)),
            low: Number(Math.min(open, tick.low, close).toFixed(currentSymbol.precision)),
            close,
            volume: tick.volume
          };
          return [...prevCandles.slice(1), updatedCandle];
        }

        if (candleTime < lastCandle.time) {
          return prevCandles;
        }

        const updatedCandle: Candle = {
          ...lastCandle,
          high: Number(Math.max(lastCandle.high, tick.high, close).toFixed(currentSymbol.precision)),
          low: Number(Math.min(lastCandle.low, tick.low, close).toFixed(currentSymbol.precision)),
          close,
          volume: tick.isLive ? tick.volume : lastCandle.volume + tick.volume
        };
        return [...prevCandles.slice(0, -1), updatedCandle];
      });
    });

    return () => {
      subscription.close();
    };
  }, [currentSymbol.id, currentSymbol.symbol, currentSymbol.type, currentSymbol.precision, timeframe, candles.length]);

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
        onResetLayout={handleResetLayout}
        onTakeScreenshot={handleTakeScreenshot}
        isLiveBinanceActive={isLiveBinanceActive}
        marketStatus={marketStatus}
        lang={lang}
        onLangChange={setLang}
        onToggleWatchlist={() => setWatchlistOpen((open) => !open)}
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
            marketStatus={marketStatus}
            analysisResult={analysisResult}
          />

          {/* Bottom Foldable panel */}
          <BottomPanel
            currentSymbol={currentSymbol}
            candles={candles}
            activeIndicators={indicatorConfig}
            timeframe={timeframe}
            lang={lang}
            marketStatus={marketStatus}
            onAnalysisResult={setAnalysisResult}
          />
        </div>

        {/* Right Watchlist list panel */}
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
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 hover:text-white rounded transition-colors cursor-pointer"
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
