import React, { useState } from "react";
import { TrendingUp, DollarSign, Search, Coins, Layers, MessageSquarePlus, X } from "lucide-react";
import { MarketSymbol } from "../../shared/src/types";
import { Language, useTranslation } from "../../shared/src/translations";

interface WatchlistProps {
  currentSymbol: MarketSymbol;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  symbolsList: MarketSymbol[];
  lang: Language;
  // Drawer props for mobile adaptation
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Watchlist({
  currentSymbol,
  onSymbolSelect,
  symbolsList,
  lang,
  isOpen = true,
  onClose
}: WatchlistProps) {
  const t = useTranslation(lang);
  const [filter, setFilter] = useState<"all" | "crypto" | "stock" | "forex">("all");

  const categoryTranslationMap = {
    all: t("allMarkets"),
    crypto: lang === "zh" ? "数字货币" : lang === "tc" ? "數字貨幣" : "Crypto",
    stock: lang === "zh" ? "传统股票" : lang === "tc" ? "傳統股票" : "Stocks",
    forex: lang === "zh" ? "外汇汇率" : lang === "tc" ? "外匯匯率" : "Forex"
  };

  const filteredSymbols = symbolsList.filter((sym) => {
    if (filter === "all") return true;
    return sym.type === filter;
  });

  const content = (
    <div className="w-full flex flex-col h-full select-none justify-between bg-slate-950 text-slate-200">
      
      {/* 1. Header & Categories Selector */}
      <div className="p-3 border-b border-slate-800 shrink-0">
        <div className="flex justify-between items-center mb-2">
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
        <div className="grid grid-cols-4 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] md:text-[11px] font-semibold text-slate-400">
          {(["all", "crypto", "stock", "forex"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`py-1 rounded cursor-pointer text-center text-ellipsis overflow-hidden transition-all duration-150 ${
                filter === cat
                  ? "bg-slate-800 text-cyan-400 font-bold shadow-md"
                  : "hover:text-white"
              }`}
            >
              {categoryTranslationMap[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* 2. List of assets */}
      <div className="flex-grow overflow-y-auto divide-y divide-slate-900 space-y-0.5">
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
              className={`px-3 py-2.5 flex items-center justify-between transition-all duration-150 cursor-pointer text-left h-[52px] ${
                isSelected 
                  ? "bg-slate-900 border-l-2 border-cyan-400 text-white" 
                  : "hover:bg-slate-900/60 text-slate-300 hover:text-white"
              }`}
            >
              <div className="flex flex-col truncate max-w-[140px]">
                <span className="font-semibold text-xs tracking-tight text-white">{sym.id}</span>
                <span className="text-[9px] text-slate-500 truncate">{sym.name}</span>
              </div>

              {/* Price action numbers */}
              <div className="flex flex-col items-end shrink-0 select-none">
                <span className="font-mono text-xs font-bold text-slate-100">
                  {sym.price.toLocaleString(undefined, { 
                    minimumFractionDigits: sym.precision, 
                    maximumFractionDigits: sym.precision 
                  })}
                </span>
                <span className={`text-[9px] font-mono leading-none px-1.5 py-0.5 rounded font-bold mt-1 ${
                  isUp 
                    ? "bg-teal-950/60 text-teal-400" 
                    : "bg-rose-950/60 text-rose-400"
                }`}>
                  {isUp ? "+" : ""}{sym.change24h.toFixed(2)}%
                </span>
              </div>
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
      <div className="p-3 bg-slate-950 border-t border-slate-900 text-xs space-y-2 shrink-0">
        <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase tracking-widest">
          <span>{lang === "zh" ? "当前聚焦资产" : lang === "tc" ? "當前聚焦資產" : "Active Asset Focus"}</span>
          <span className="px-1.5 py-0.5 bg-slate-900 text-cyan-400 border border-slate-800 rounded font-mono font-bold">{currentSymbol.type}</span>
        </div>
        
        <div className="bg-slate-900/40 p-2 rounded border border-slate-900 space-y-1">
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-500 font-sans">{t("volume24h")}:</span>
            <span className="text-slate-300">${(currentSymbol.volume24h).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-500 font-sans">{lang === "zh" ? "棱镜折射率" : lang === "tc" ? "稜鏡折射率" : "Refraction Index"}:</span>
            <span className="text-cyan-400 font-extrabold uppercase">{lang === "zh" ? "数据良好" : lang === "tc" ? "數據良好" : "Stable Feed"}</span>
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop sidebar view */}
      <div className="hidden md:flex w-72 border-l border-slate-840 shrink-0 h-full">
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
