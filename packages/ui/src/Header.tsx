import React, { useState } from "react";
import { 
  TrendingUp, Search, Calendar, BarChart2, Eye, Layout, 
  Settings, Camera, Bookmark, RefreshCw, AlertCircle, Menu, X, Check, Globe
} from "lucide-react";
import { MarketSymbol, AppSettings } from "../../shared/src/types";
import { DEFAULT_SYMBOLS } from "../../shared/src/mockMarketData";
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
  lang,
  onLangChange,
  onToggleWatchlist
}: HeaderProps) {
  const t = useTranslation(lang);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1D", "1W", "1M"];
  const chartTypes = [
    { label: "Candle", value: "candlestick" },
    { label: "Line", value: "line" },
    { label: "Area", value: "area" },
    { label: "Bars", value: "bars" }
  ];

  const filteredSymbols = DEFAULT_SYMBOLS.filter(
    (sym) =>
      sym.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sym.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="border-b border-slate-800 bg-slate-950 px-3 md:px-4 py-2 flex items-center justify-between text-slate-200 select-none z-50 relative">
      {/* 1. Brand Logo & Name */}
      <div className="flex items-center gap-2">
        <Logo showText={true} className="h-8 shrink-0" />
      </div>

      {/* 2. Controls Area (Scrollable/Wrap on Mobile, Spaced on Desktop) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-grow md:justify-start justify-end px-2 md:px-4">
        
        {/* Symbol Selector Panel */}
        <div className="relative shrink-0">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-md text-xs md:text-sm text-slate-200 transition-all cursor-pointer font-medium w-32 md:w-44 text-left justify-between"
            id="symbol_search_btn"
          >
            <div className="flex items-center gap-1 md:gap-1.5 truncate">
              <Search className="h-3 md:h-3.5 w-3 md:w-3.5 text-cyan-400" />
              <span className="truncate">{currentSymbol.id}</span>
            </div>
            <span className="text-[8px] md:text-[9px] px-1 bg-slate-800 text-slate-400 rounded font-mono uppercase">
              {currentSymbol.type}
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
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100">{sym.id}</span>
                        <span className="text-[10px] text-slate-500">{sym.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-medium">${sym.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
          {isLiveBinanceActive ? (
            <div className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-teal-950/40 border border-teal-800/60 rounded-full" title="Real-time WebSockets connected">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse"></span>
              <span className="text-[8px] md:text-[9px] font-mono font-bold text-teal-400 uppercase tracking-widest hidden sm:inline">{t("liveWss")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-rose-950/40 border border-rose-800/60 rounded-full" title="High-fidelity simulator engine active">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
              <span className="text-[8px] md:text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest hidden sm:inline font-semibold">{t("simFeed")}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-800 shrink-0 mx-1 hidden sm:block"></div>

        {/* Timeframe Slider tab (Horizontal scroll adapts for narrow views) */}
        <div className="flex items-center bg-slate-900 p-0.5 rounded-md border border-slate-800 shrink-0" id="timeframe_selector_group">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeSelect(tf)}
              className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs rounded transition-all font-mono font-bold cursor-pointer ${
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
        <div className="hidden md:flex items-center bg-slate-900 p-0.5 rounded-md border border-slate-800 shrink-0">
          {chartTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onChartTypeSelect(type.value)}
              className={`px-2 py-1 text-xs rounded transition-all font-medium cursor-pointer ${
                chartType === type.value
                  ? "bg-slate-800 text-cyan-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-800 shrink-0 mx-1 hidden lg:block"></div>

        {/* Technical Indicators Toggle */}
        <button
          onClick={onOpenIndicators}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-md text-xs font-semibold hover:text-white cursor-pointer transition-all shrink-0"
          id="indicators_btn"
        >
          <Eye className="h-3.5 w-3.5 text-cyan-400" />
          <span>{t("techIndicators")}</span>
        </button>
      </div>

      {/* 3. Action Utilities (Desktop vs Mobile layout) */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        
        {/* Watchlist toggle for mobile/tablet screens */}
        {onToggleWatchlist && (
          <button
            onClick={onToggleWatchlist}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 rounded-md text-cyan-400 md:hidden cursor-pointer transition-all"
            title="Toggle Watchlist Drawer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Indicator modal trigger for tablet (under lg) */}
        <button
          onClick={onOpenIndicators}
          className="lg:hidden flex items-center justify-center p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-slate-400 hover:text-white cursor-pointer transition-all"
          title={t("techIndicators")}
        >
          <Eye className="h-4 w-4 text-cyan-400" />
        </button>

        {/* Workspace Save */}
        <button
          onClick={onSaveWorkspace}
          className={`flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 border rounded-md text-[10px] md:text-xs font-bold cursor-pointer transition-all shrink-0 ${
            workspaceSaved 
              ? "bg-cyan-950 text-cyan-400 border-cyan-800" 
              : "bg-slate-900 hover:bg-slate-850 stroke-slate-300 border-slate-800 hover:text-white"
          }`}
          title={t("saveLayout")}
        >
          <Bookmark className={`h-3 w-3 md:h-3.5 md:w-3.5 ${workspaceSaved ? "fill-cyan-400 text-cyan-400" : ""}`} />
          <span className="hidden sm:inline">{workspaceSaved ? t("saved") : t("saveLayout")}</span>
        </button>

        {/* Reset workspace layout */}
        <button
          onClick={onResetLayout}
          className="hidden sm:block p-1.5 bg-slate-900 hover:bg-rose-950/20 hover:text-rose-400 border border-slate-800 rounded-md text-slate-450 cursor-pointer transition-all shrink-0"
          title={t("resetDashboard")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Take rapid screenshot */}
        <button
          onClick={onTakeScreenshot}
          className="hidden sm:block p-1.5 bg-slate-900 hover:bg-slate-820 border border-slate-800 rounded-md text-slate-450 hover:text-white cursor-pointer transition-all shrink-0"
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
          className="flex items-center gap-1 px-2 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 rounded-md text-xs font-bold text-cyan-400 cursor-pointer transition-all shrink-0"
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
          className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 rounded-md text-cyan-400 cursor-pointer transition-all shrink-0"
          id="config_modal_btn"
        >
          <Settings className="h-4 w-4 animate-hover-spin" />
        </button>
      </div>
    </header>
  );
}
