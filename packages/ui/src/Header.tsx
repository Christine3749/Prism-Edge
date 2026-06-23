import React, { useEffect, useMemo, useState } from "react";
import { 
  TrendingUp, Search, BarChart2, Eye, Layout,
  Settings, Camera, Bookmark, RefreshCw, Menu, Globe
} from "lucide-react";
import { MarketSymbol, AppSettings, MarketDataStatus } from "../../shared/src/types";
import { searchMarketSymbols } from "../../shared/src/marketCatalog";
import { Language, useTranslation } from "../../shared/src/translations";
import Logo from "./Logo";

interface HeaderProps {
  currentSymbol: MarketSymbol;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  currentTimeframe: string;
  onTimeframeSelect: (tf: string) => void;
  chartType: string;
  onChartTypeSelect: (type: string) => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenIndicators: () => void;
  onSaveWorkspace: () => void;
  workspaceSaved: boolean;
  onResetLayout: () => void;
  onTakeScreenshot: () => void;
  isLiveBinanceActive: boolean;
  marketStatus?: MarketDataStatus;
  lang: Language;
  onLangChange: (lang: Language) => void;
  // Mobile responsive helper states
  onToggleWatchlist?: () => void;
}

export default function Header({
  currentSymbol,
  onSymbolSelect,
  currentTimeframe,
  onTimeframeSelect,
  chartType,
  onChartTypeSelect,
  settings,
  onOpenSettings,
  onOpenIndicators,
  onSaveWorkspace,
  workspaceSaved,
  onResetLayout,
  onTakeScreenshot,
  isLiveBinanceActive,
  marketStatus,
  lang,
  onLangChange,
  onToggleWatchlist
}: HeaderProps) {
  const t = useTranslation(lang);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteSymbols, setRemoteSymbols] = useState<MarketSymbol[]>([]);

  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1D", "1W", "1M"];
  const chartTypes = [
    { label: "Candle", value: "candlestick", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { label: "Line", value: "line", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { label: "Area", value: "area", icon: <Layout className="h-3.5 w-3.5" /> },
    { label: "Bars", value: "bars", icon: <BarChart2 className="h-3.5 w-3.5" /> }
  ];

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || query.length < 2) {
      setRemoteSymbols([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: "18" });
        const response = await fetch(`/api/market/search?${params.toString()}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal
        });

        if (!response.ok) return;
        const payload = await response.json() as { results?: MarketSymbol[] };
        setRemoteSymbols(Array.isArray(payload.results) ? payload.results : []);
      } catch {
        if (!controller.signal.aborted) {
          setRemoteSymbols([]);
        }
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchQuery]);

  const filteredSymbols = useMemo(() => {
    const local = searchMarketSymbols(searchQuery, "all", searchQuery.trim() ? 32 : 36);
    const merged = new Map<string, MarketSymbol>();
    [...local, ...remoteSymbols].forEach((symbol) => {
      merged.set(symbol.symbol, symbol);
    });
    return Array.from(merged.values()).slice(0, 60);
  }, [searchQuery, remoteSymbols]);

  const feedState = marketStatus?.state || (isLiveBinanceActive ? "live" : "simulated");
  const feedLabel = {
    loading: lang === "zh" ? "载入" : lang === "tc" ? "載入" : "Loading",
    live: t("liveWss"),
    delayed: lang === "zh" ? "延迟" : lang === "tc" ? "延遲" : "Delayed",
    simulated: t("simFeed"),
    stale: lang === "zh" ? "延迟" : lang === "tc" ? "延遲" : "Stale",
    error: lang === "zh" ? "断线" : lang === "tc" ? "斷線" : "Error"
  }[feedState];
  const feedClass = {
    loading: "bg-sky-950/40 border-sky-800/60 text-sky-400",
    live: "bg-teal-950/40 border-teal-800/60 text-teal-400",
    delayed: "bg-blue-950/40 border-blue-800/60 text-blue-300",
    simulated: "bg-amber-950/40 border-amber-800/60 text-amber-300",
    stale: "bg-orange-950/40 border-orange-800/60 text-orange-300",
    error: "bg-rose-950/40 border-rose-800/60 text-rose-400"
  }[feedState];
  const dotClass = {
    loading: "bg-sky-400 animate-pulse",
    live: "bg-teal-400 animate-pulse",
    delayed: "bg-blue-300",
    simulated: "bg-amber-300",
    stale: "bg-orange-300",
    error: "bg-rose-400"
  }[feedState];

  return (
    <header className="h-12 shrink-0 border-b border-slate-800 bg-slate-950 px-2.5 md:px-3 flex items-center gap-2 text-slate-200 select-none z-50 relative overflow-visible">
      {/* 1. Brand Logo & Name */}
      <div className="hidden sm:flex w-[190px] min-w-[170px] shrink-0 items-center">
        <Logo showText={true} className="h-8 shrink-0" />
      </div>

      {/* 2. Controls Area (Scrollable/Wrap on Mobile, Spaced on Desktop) */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth justify-start">
        
        {/* Symbol Selector Panel */}
        <div className="relative shrink-0">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex h-7 items-center gap-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 rounded text-[11px] text-slate-200 transition-all cursor-pointer font-medium w-32 xl:w-40 text-left justify-between"
            id="symbol_search_btn"
          >
            <div className="flex items-center gap-1 md:gap-1.5 truncate">
              <Search className="h-3 md:h-3.5 w-3 md:w-3.5 text-cyan-400" />
              <span className="truncate">{currentSymbol.id}</span>
            </div>
            <span className="text-[9px] px-1 bg-slate-800 text-slate-400 rounded font-mono uppercase">
              {currentSymbol.exchange || currentSymbol.market || currentSymbol.type}
            </span>
          </button>

          {searchOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setSearchOpen(false)}
              ></div>
              <div className="absolute left-0 mt-1.5 w-72 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-2 z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-md mb-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchAsset")}
                    className="bg-transparent border-none text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none w-full"
                    autoFocus
                  />
                </div>
                
                <div className="text-[9px] font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
                  {t("selectMarkets")}
                </div>
                <div className="space-y-0.5">
                  {filteredSymbols.map((sym) => (
                    <button
                      key={sym.id}
                      onClick={() => {
                        onSymbolSelect(sym);
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-2 py-2 rounded-md hover:bg-slate-800 flex items-center justify-between text-xs md:text-sm transition-all text-slate-300 hover:text-white"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-slate-100">{sym.id}</span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {sym.name} · {sym.exchange || sym.market || sym.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-medium">
                          {sym.price > 0
                            ? sym.price.toLocaleString(undefined, { minimumFractionDigits: Math.min(sym.precision, 2), maximumFractionDigits: sym.precision })
                            : (sym.currency || sym.type).toUpperCase()}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${sym.change24h >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          {sym.change24h >= 0 ? "+" : ""}{sym.change24h}%
                        </span>
                      </div>
                    </button>
                  ))}
                  {filteredSymbols.length === 0 && (
                    <div className="text-center text-xs text-slate-500 py-4">
                      {t("noAssetsFound")}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Live Status indicator */}
        <div className="shrink-0 flex">
          <div
            className={`h-7 flex items-center gap-1 px-2 border rounded-full ${feedClass}`}
            title={`${marketStatus?.source || "gateway"} · ${marketStatus?.message || ""}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`}></span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest hidden lg:inline">{feedLabel}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-800 shrink-0 mx-1 hidden sm:block"></div>

        {/* Timeframe Slider tab (Horizontal scroll adapts for narrow views) */}
        <div className="h-7 flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 shrink-0" id="timeframe_selector_group">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeSelect(tf)}
              className={`h-5 min-w-6 px-1.5 text-[10px] rounded transition-all font-mono font-bold cursor-pointer ${
                currentTimeframe === tf
                  ? "bg-cyan-500 text-slate-950 font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-800 shrink-0 mx-1 hidden md:block"></div>

        {/* Chart Style Switcher */}
        <div className="hidden md:flex h-7 items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800 shrink-0">
          {chartTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onChartTypeSelect(type.value)}
              className={`h-5 min-w-6 px-1.5 flex items-center justify-center gap-1.5 text-[11px] rounded transition-all font-medium cursor-pointer ${
                chartType === type.value
                  ? "bg-slate-800 text-cyan-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={type.label}
            >
              {type.icon}
              <span className="hidden xl:inline">{type.label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-800 shrink-0 mx-1 hidden lg:block"></div>

        {/* Technical Indicators Toggle */}
        <button
          onClick={onOpenIndicators}
          className="hidden lg:flex h-7 items-center gap-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] font-semibold hover:text-white cursor-pointer transition-all shrink-0"
          id="indicators_btn"
        >
          <Eye className="h-3.5 w-3.5 text-cyan-400" />
          <span>{t("techIndicators")}</span>
        </button>
      </div>

      {/* 3. Action Utilities (Desktop vs Mobile layout) */}
      <div className="flex items-center gap-1.5 shrink-0">
        
        {/* Watchlist toggle for mobile/tablet screens */}
        {onToggleWatchlist && (
          <button
            onClick={onToggleWatchlist}
            className="h-7 w-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 rounded text-cyan-400 md:hidden cursor-pointer transition-all"
            title="Toggle Watchlist Drawer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Indicator modal trigger for tablet (under lg) */}
        <button
          onClick={onOpenIndicators}
          className="lg:hidden h-7 w-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-all"
          title={t("techIndicators")}
        >
          <Eye className="h-4 w-4 text-cyan-400" />
        </button>

        {/* Workspace Save */}
        <button
          onClick={onSaveWorkspace}
          className={`h-7 flex items-center gap-1 px-2 border rounded text-[11px] font-bold cursor-pointer transition-all shrink-0 ${
            workspaceSaved 
              ? "bg-cyan-950 text-cyan-400 border-cyan-800" 
              : "bg-slate-900 hover:bg-slate-800 stroke-slate-300 border-slate-800 hover:text-white"
          }`}
          title={t("saveLayout")}
        >
          <Bookmark className={`h-3 w-3 md:h-3.5 md:w-3.5 ${workspaceSaved ? "fill-cyan-400 text-cyan-400" : ""}`} />
          <span className="hidden xl:inline">{workspaceSaved ? t("saved") : t("saveLayout")}</span>
        </button>

        {/* Reset workspace layout */}
        <button
          onClick={onResetLayout}
          className="hidden sm:flex h-7 w-7 items-center justify-center bg-slate-900 hover:bg-rose-950/20 hover:text-rose-400 border border-slate-800 rounded text-slate-400 cursor-pointer transition-all shrink-0"
          title={t("resetDashboard")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Take rapid screenshot */}
        <button
          onClick={onTakeScreenshot}
          className="hidden sm:flex h-7 w-7 items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-all shrink-0"
          title={t("exportSnapshot")}
        >
          <Camera className="h-3.5 w-3.5 text-sky-400" />
        </button>

        {/* Dynamic Globe Language Toggle Button */}
        <button
          onClick={() => {
            if (lang === "zh") onLangChange("en");
            else if (lang === "en") onLangChange("tc");
            else onLangChange("zh");
          }}
          className="h-7 flex items-center gap-1 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded text-[11px] font-bold text-cyan-400 cursor-pointer transition-all shrink-0"
          title="Switch Language / 切换语言"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="text-[10px] font-mono leading-none">
            {lang === "zh" ? "简" : lang === "tc" ? "繁" : "EN"}
          </span>
        </button>

        <div className="w-px h-5 bg-slate-800 shrink-0 mx-0.5 hidden sm:block"></div>

        {/* Settings modal trigger */}
        <button
          onClick={onOpenSettings}
          className="h-7 w-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded text-cyan-400 cursor-pointer transition-all shrink-0"
          id="config_modal_btn"
        >
          <Settings className="h-4 w-4 animate-hover-spin" />
        </button>
      </div>
    </header>
  );
}
