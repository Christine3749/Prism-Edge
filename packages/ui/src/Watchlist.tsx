import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { MarketDataStatus, MarketSymbol } from "../../shared/src/types";
import { Language, useTranslation } from "../../shared/src/translations";

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
  const [filter, setFilter] = useState<"all" | "crypto" | "stock" | "forex">("all");
  const [query, setQuery] = useState("");

  const categoryTranslationMap = {
    all: t("allMarkets"),
    crypto: lang === "zh" ? "数字货币" : lang === "tc" ? "數字貨幣" : "Crypto",
    stock: lang === "zh" ? "传统股票" : lang === "tc" ? "傳統股票" : "Stocks",
    forex: lang === "zh" ? "外汇汇率" : lang === "tc" ? "外匯匯率" : "Forex"
  };

  const filteredSymbols = symbolsList.filter((sym) => {
    const matchesFilter = filter === "all" || sym.type === filter;
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = normalizedQuery.length === 0 ||
      sym.id.toLowerCase().includes(normalizedQuery) ||
      sym.symbol.toLowerCase().includes(normalizedQuery) ||
      sym.name.toLowerCase().includes(normalizedQuery);
    return matchesFilter && matchesQuery;
  });
  const statusTone = marketStatus?.state === "live"
    ? "text-teal-400"
    : marketStatus?.state === "stale"
      ? "text-orange-300"
      : marketStatus?.state === "error"
        ? "text-rose-400"
        : "text-amber-300";

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
        <div className="grid grid-cols-4 bg-slate-900 p-0.5 rounded border border-slate-800 text-[9px] font-semibold text-slate-400">
          {(["all", "crypto", "stock", "forex"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`py-0.5 rounded cursor-pointer text-center truncate transition-all duration-150 ${
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
            {marketStatus?.source || "feed"}
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
                <span className="text-[8px] text-slate-500 truncate">{sym.name}</span>
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
          <span className={`px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono font-bold ${statusTone}`}>
            {marketStatus?.state || currentSymbol.type}
          </span>
        </div>
        
        <div className="bg-slate-900/30 p-2 rounded border border-slate-900 space-y-1">
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-500 font-sans">{t("volume24h")}:</span>
            <span className="text-slate-300">${(currentSymbol.volume24h).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-500 font-sans">{lang === "zh" ? "棱镜折射率" : lang === "tc" ? "稜鏡折射率" : "Refraction Index"}:</span>
            <span className={`font-extrabold uppercase ${statusTone}`}>
              {marketStatus?.state === "stale"
                ? (lang === "zh" ? "数据延迟" : lang === "tc" ? "數據延遲" : "Stale Feed")
                : marketStatus?.state === "live"
                  ? (lang === "zh" ? "真实行情" : lang === "tc" ? "真實行情" : "Live Feed")
                  : (lang === "zh" ? "模拟保护" : lang === "tc" ? "模擬保護" : "Fallback")}
            </span>
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
