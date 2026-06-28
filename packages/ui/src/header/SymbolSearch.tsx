import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { searchMarketSymbols } from "../../../shared/src/marketCatalog";
import { buildMarketApiUrl } from "../../../shared/src/marketDataService";
import type { MarketSymbol } from "../../../shared/src/types";
import { TRANSLATIONS } from "../../../shared/src/translations";

type TranslationFn = (key: keyof typeof TRANSLATIONS) => string;

interface SymbolSearchProps {
  currentSymbol: MarketSymbol;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  t: TranslationFn;
}

export function SymbolSearch({ currentSymbol, onSymbolSelect, t }: SymbolSearchProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteSymbols, setRemoteSymbols] = useState<MarketSymbol[]>([]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!searchOpen || query.length < 2) {
      setRemoteSymbols([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: "18" });
        const response = await fetch(buildMarketApiUrl(`/api/market/search?${params.toString()}`), {
          headers: { Accept: "application/json" },
          signal: controller.signal
        });
        if (!response.ok) return;
        const payload = await response.json() as { results?: MarketSymbol[] };
        setRemoteSymbols(Array.isArray(payload.results) ? payload.results : []);
      } catch {
        if (!controller.signal.aborted) setRemoteSymbols([]);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
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

  return (
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
          <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)}></div>
          <div className="absolute left-0 mt-1.5 w-72 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-2 z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t("searchAsset")} />
            <div className="text-[9px] font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
              {t("selectMarkets")}
            </div>
            <div className="space-y-0.5">
              {filteredSymbols.map((sym) => (
                <SymbolResult
                  key={sym.id}
                  symbol={sym}
                  onSelect={() => {
                    onSymbolSelect(sym);
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                />
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
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-md mb-2">
      <Search className="h-4 w-4 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent border-none text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none w-full"
        autoFocus
      />
    </div>
  );
}

function SymbolResult({ symbol, onSelect }: { symbol: MarketSymbol; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-2 py-2 rounded-md hover:bg-slate-800 flex items-center justify-between text-xs md:text-sm transition-all text-slate-300 hover:text-white"
    >
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-slate-100">{symbol.id}</span>
        <span className="text-[10px] text-slate-500 truncate">
          {symbol.name} · {symbol.exchange || symbol.market || symbol.type}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono font-medium">
          {symbol.price > 0
            ? symbol.price.toLocaleString(undefined, { minimumFractionDigits: Math.min(symbol.precision, 2), maximumFractionDigits: symbol.precision })
            : (symbol.currency || symbol.type).toUpperCase()}
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${symbol.change24h >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
          {symbol.change24h >= 0 ? "+" : ""}{symbol.change24h}%
        </span>
      </div>
    </button>
  );
}
