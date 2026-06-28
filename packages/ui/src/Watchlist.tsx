import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { MarketDataStatus, MarketSymbol } from "../../shared/src/types";
import { Language, useTranslation } from "../../shared/src/translations";
import { describeMarketStatus, formatFeedAge } from "../../shared/src/marketStatus";

interface WatchlistProps {
  currentSymbol: MarketSymbol;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  symbolsList: MarketSymbol[];
  lang: Language;
  marketStatus?: MarketDataStatus;
  // Drawer props for mobile adaptation
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Watchlist({
  currentSymbol,
  onSymbolSelect,
  symbolsList,
  lang,
  marketStatus,
  isOpen = false,
  onClose
}: WatchlistProps) {
  const t = useTranslation(lang);
  type WatchlistFilter = "all" | "crypto" | "us" | "cn" | "hk" | "forex";
  const [filter, setFilter] = useState<WatchlistFilter>("all");
  const [query, setQuery] = useState("");

  const categoryTranslationMap = {
    all: t("allMarkets"),
    crypto: "Crypto",
    us: lang === "zh" ? "美股" : lang === "tc" ? "美股" : "US",
    cn: lang === "zh" ? "A股" : lang === "tc" ? "A股" : "A-Share",
    hk: lang === "zh" ? "港股" : lang === "tc" ? "港股" : "HK",
    forex: lang === "zh" ? "外汇" : lang === "tc" ? "外匯" : "FX"
  };

  const filteredSymbols = symbolsList.filter((sym) => {
    const symbolMarket = sym.market || sym.type;
    const matchesFilter = filter === "all" ||
      (filter === "crypto" && (symbolMarket === "crypto" || sym.type === "crypto")) ||
      (filter === "forex" && (symbolMarket === "forex" || sym.type === "forex")) ||
      symbolMarket === filter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = normalizedQuery.length === 0 ||
      sym.id.toLowerCase().includes(normalizedQuery) ||
      sym.symbol.toLowerCase().includes(normalizedQuery) ||
      sym.name.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });
  const statusTone = marketStatus?.state === "live"
    ? "text-teal-400"
    : marketStatus?.state === "delayed"
      ? "text-blue-300"
    : marketStatus?.state === "stale"
      ? "text-orange-300"
      : marketStatus?.state === "error"
        ? "text-rose-400"
        : "text-amber-300";
  const feedToneMap = {
    live: "border-teal-500/20 bg-teal-500/10 text-teal-300",
    delayed: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    stale: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    error: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    simulated: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    loading: "border-sky-500/20 bg-sky-500/10 text-sky-300"
  };
  const feedLabelMap = {
    live: "LIVE",
    delayed: "DELAY",
    stale: "STALE",
    error: "ERR",
    simulated: "SIM",
    loading: "LOAD"
  };

  const getSymbolFeedState = (symbol: MarketSymbol, selected: boolean): MarketDataStatus["state"] => {
    if (selected && marketStatus?.state) return marketStatus.state;
    if (symbol.lastDataState) return symbol.lastDataState;
    if (symbol.dataProvider === "binance" || symbol.dataProvider === "coinbase") return "live";
    if (symbol.dataProvider === "yahoo") return "delayed";
    return "simulated";
  };
  const activeSource = marketStatus?.source || currentSymbol.lastSource || currentSymbol.dataProvider || "gateway";
  const activeMarketStatus: MarketDataStatus = marketStatus || {
    state: currentSymbol.lastDataState || getSymbolFeedState(currentSymbol, true),
    source: activeSource,
    provider: currentSymbol.exchange || currentSymbol.market,
    updatedAt: currentSymbol.lastUpdatedAt,
    reason: "Market gateway status is being resolved."
  };
  const activeMeta = describeMarketStatus(activeMarketStatus, lang);
  const feedAge = formatFeedAge(activeMarketStatus.updatedAt, Date.now(), lang);

  const content = (
    <div className="w-full flex flex-col h-full select-none justify-between bg-slate-950 text-slate-200">
      
      {/* 1. Header & Categories Selector */}
      <div className="p-2.5 border-b border-slate-800 shrink-0">
        <div className="flex justify-between items-center mb-1.5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t("brandName")} {t("watchlist")}
          </h3>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white md:hidden cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Market filters tab */}
        <div className="flex gap-0.5 overflow-x-auto no-scrollbar bg-slate-900 p-0.5 rounded border border-slate-800 text-[9px] font-semibold text-slate-400">
          {(["all", "crypto", "us", "cn", "hk", "forex"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`min-w-10 px-1.5 py-0.5 rounded cursor-pointer text-center truncate transition-all duration-150 ${
                filter === cat
                  ? "bg-slate-800 text-cyan-400 font-bold shadow-md"
                  : "hover:text-white"
              }`}
            >
              {categoryTranslationMap[cat]}
            </button>
          ))}
        </div>
        <div className="mt-2 flex h-7 items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2">
          <Search className="h-3 w-3 shrink-0 text-cyan-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchAsset")}
            className="min-w-0 flex-1 bg-transparent text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
          <span className={`shrink-0 text-[8px] font-mono font-bold uppercase tracking-widest ${statusTone}`}>
            {filteredSymbols.length}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_76px_52px] gap-2 px-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-600">
          <span>Symbol</span>
          <span className="text-right">Last</span>
          <span className="text-right">Chg%</span>
        </div>
      </div>

      {/* 2. List of assets */}
      <div className="flex-grow overflow-y-auto divide-y divide-slate-900">
        {filteredSymbols.map((sym) => {
          const isSelected = sym.id === currentSymbol.id;
          const isUp = sym.change24h >= 0;
          const feedState = getSymbolFeedState(sym, isSelected);
          const feedTone = feedToneMap[feedState];
          const sourceLabel = isSelected && marketStatus?.source
            ? marketStatus.source
            : sym.lastSource || sym.dataProvider || sym.exchange || sym.type;
          return (
            <div
              key={sym.id}
              onClick={() => {
                onSymbolSelect(sym);
                if (onClose) onClose(); // Close on cell select on mobile
              }}
              className={`px-2.5 py-1.5 grid grid-cols-[minmax(0,1fr)_76px_52px] gap-2 items-center transition-all duration-150 cursor-pointer text-left h-[46px] ${
                isSelected 
                  ? "bg-slate-900 border-l-2 border-cyan-400 text-white" 
                  : "hover:bg-slate-900/60 text-slate-300 hover:text-white"
              }`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-semibold text-[11px] tracking-tight text-white truncate">{sym.id}</span>
                <div className="flex min-w-0 items-center gap-1">
                  <span className="truncate text-[8px] text-slate-500">
                    {sym.name} · {sym.exchange || sym.market || sym.type}
                  </span>
                  <span
                    title={`${sourceLabel} · ${feedState}`}
                    className={`shrink-0 rounded border px-1 py-[1px] font-mono text-[7px] font-black leading-none ${feedTone}`}
                  >
                    {feedLabelMap[feedState]}
                  </span>
                </div>
              </div>

              {/* Price action numbers */}
              <span className="min-w-0 text-right font-mono text-[11px] font-bold text-slate-100 tabular-nums">
                {sym.price.toLocaleString(undefined, {
                  minimumFractionDigits: sym.precision,
                  maximumFractionDigits: sym.precision
                })}
              </span>
              <span className={`text-right text-[10px] font-mono leading-none font-bold ${
                isUp ? "text-teal-400" : "text-rose-400"
              }`}>
                {isUp ? "+" : ""}{sym.change24h.toFixed(2)}%
              </span>
            </div>
          );
        })}
        {filteredSymbols.length === 0 && (
          <div className="text-center text-xs text-slate-600 py-12 px-4">
            {t("noAssetsFound")}
          </div>
        )}
      </div>

      {/* 3. Stat Card Bottom Footer */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-900 text-xs space-y-1.5 shrink-0">
        <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-widest">
          <span>{lang === "zh" ? "当前聚焦资产" : lang === "tc" ? "當前聚焦資產" : "Active Asset Focus"}</span>
          <span className={`px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono font-bold ${statusTone}`} title={activeMeta.tooltip}>
            {activeMeta.shortLabel}
          </span>
        </div>
        
        <div className="bg-slate-900/30 p-2 rounded border border-slate-900 space-y-1">
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-500 font-sans">{t("volume24h")}:</span>
            <span className="text-slate-300">${(currentSymbol.volume24h).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-500 font-sans">{lang === "zh" ? "数据源" : lang === "tc" ? "數據源" : "Source"}:</span>
            <span className="max-w-36 truncate text-slate-300" title={activeMeta.tooltip}>
              {activeMeta.sourceLine}
            </span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-500 font-sans">{lang === "zh" ? "最近更新" : lang === "tc" ? "最近更新" : "Updated"}:</span>
            <span className="text-slate-300">{feedAge || "-"}</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-500 font-sans">{lang === "zh" ? "可信度" : lang === "tc" ? "可信度" : "Confidence"}:</span>
            <span className={`font-extrabold uppercase ${statusTone}`}>{activeMeta.qualityLabel} · {activeMeta.confidenceLabel}</span>
          </div>
          <div className="flex justify-between gap-2 font-mono text-[10px]">
            <span className="text-slate-500 font-sans">{lang === "zh" ? "原因" : lang === "tc" ? "原因" : "Reason"}:</span>
            <span className="max-w-40 truncate text-right text-slate-400" title={activeMeta.reason}>{activeMeta.reason}</span>
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop sidebar view */}
      <div className="hidden md:flex w-[276px] min-w-[276px] xl:w-[300px] xl:min-w-[300px] border-l border-slate-800 shrink-0 h-full">
        {content}
      </div>

      {/* Mobile Drawer view overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          ></div>
          <div className="relative w-80 max-w-[85%] h-full bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
