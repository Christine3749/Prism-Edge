import { useMemo, useState } from "react";
import { Radio, Search, Star, X } from "lucide-react";
import { searchMarketSymbols } from "../../shared/src/marketCatalog";
import { buildPrismIntelligence, describePrismIntelligence, getBiasLabel, type PrismIntelligence } from "../../shared/src/prismIntelligence";
import { MarketDataStatus, MarketSymbol } from "../../shared/src/types";
import { Language, useTranslation } from "../../shared/src/translations";

interface WatchlistProps {
  currentSymbol: MarketSymbol;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  symbolsList: MarketSymbol[];
  lang: Language;
  marketStatus?: MarketDataStatus;
  isOpen?: boolean;
  onClose?: () => void;
  compressed?: boolean;
  favoriteSymbols?: string[];
  onToggleFavorite?: (symbol: MarketSymbol) => void;
}

type WatchlistFilter = "all" | "favorites" | "crypto" | "us" | "cn" | "hk" | "forex";

export default function Watchlist({
  currentSymbol,
  onSymbolSelect,
  symbolsList,
  lang,
  marketStatus,
  isOpen = false,
  onClose,
  compressed = false,
  favoriteSymbols = [],
  onToggleFavorite
}: WatchlistProps) {
  const t = useTranslation(lang);
  const zh = lang === "zh" || lang === "tc";
  const [filter, setFilter] = useState<WatchlistFilter>("all");
  const [query, setQuery] = useState("");
  const favoriteSet = useMemo(() => new Set(favoriteSymbols), [favoriteSymbols]);

  const categoryTranslationMap = {
    all: t("allMarkets"),
    favorites: zh ? "自选" : "Fav",
    crypto: "Crypto",
    us: zh ? "美股" : "US",
    cn: zh ? "A股" : "A-Share",
    hk: zh ? "港股" : "HK",
    forex: zh ? "外汇" : "FX"
  };

  const filteredSymbols = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const localMatches = symbolsList.filter((sym) => {
      const symbolMarket = sym.market || sym.type;
      const isFavorite = favoriteSet.has(sym.symbol);
      const matchesFilter = filter === "favorites"
        ? isFavorite
        : filter === "all" ||
          (filter === "crypto" && (symbolMarket === "crypto" || sym.type === "crypto")) ||
          (filter === "forex" && (symbolMarket === "forex" || sym.type === "forex")) ||
          symbolMarket === filter;
      const matchesQuery = normalizedQuery.length === 0 ||
        sym.id.toLowerCase().includes(normalizedQuery) ||
        sym.symbol.toLowerCase().includes(normalizedQuery) ||
        sym.name.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });

    if (!normalizedQuery || filter === "favorites") return localMatches;

    const catalogMatches = searchMarketSymbols(query, filter === "all" ? "all" : filter, 60);
    const merged = new Map<string, MarketSymbol>();
    localMatches.forEach((symbol) => merged.set(symbol.symbol, symbol));
    catalogMatches.forEach((symbol) => merged.set(symbol.symbol, symbol));
    return Array.from(merged.values());
  }, [favoriteSet, filter, query, symbolsList]);

  const matrixRows = useMemo(() => filteredSymbols.map((sym) => {
    const isSelected = sym.id === currentSymbol.id;
    const feedState = getSymbolFeedState(sym, isSelected, marketStatus);
    const intelligence = buildPrismIntelligence(sym, [], isSelected ? marketStatus : undefined);
    const rowBrief = describePrismIntelligence(intelligence, sym, lang);
    return { sym, feedState, intelligence, setup: rowBrief.setup, isFavorite: favoriteSet.has(sym.symbol) };
  }).sort((a, b) => b.intelligence.score - a.intelligence.score), [currentSymbol.id, favoriteSet, filteredSymbols, lang, marketStatus]);

  const statusTone = marketStatus?.state === "live"
    ? "text-emerald-300"
    : marketStatus?.state === "delayed"
      ? "text-blue-300/75"
      : marketStatus?.state === "stale"
        ? "text-orange-300"
        : marketStatus?.state === "error"
          ? "text-rose-400"
          : "text-amber-300";

  const desktopShell = compressed
    ? "pointer-events-none hidden h-full w-0 min-w-0 shrink-0 overflow-hidden border-l border-transparent bg-slate-950/0 p-0 opacity-0 transition-[width,min-width,opacity,padding,border-color] duration-500 md:flex xl:w-0 xl:min-w-0"
    : "hidden h-full w-[292px] min-w-[292px] shrink-0 border-l border-slate-800 bg-slate-950/80 p-2 opacity-100 transition-[width,min-width,opacity,padding,border-color] duration-500 md:flex xl:w-[324px] xl:min-w-[324px]";

  const content = (
    <div className="flex h-full w-full select-none flex-col overflow-hidden rounded-md border border-slate-800/80 bg-slate-950/95 text-slate-200 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]">
      <div className="shrink-0 border-b border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-blue-300/70">
              <Radio className="h-4 w-4" />
              <h3 className="truncate text-[11px] font-black uppercase tracking-[0.22em]">
                PRISM SIGNAL MATRIX
              </h3>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">
              {zh ? "唯一资产排序区 / 谁更值得看" : "Single asset ranking surface / what deserves attention"}
            </p>
          </div>
          <div className="shrink-0 text-right font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">
            <div className={statusTone}>{marketStatus?.state || "SCAN"}</div>
            <div className="mt-1">{filteredSymbols.length} assets</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-900 hover:text-white md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-0.5 overflow-x-auto rounded border border-slate-800 bg-slate-900 p-0.5 text-[9px] font-semibold text-slate-400 no-scrollbar">
          {(["all", "favorites", "crypto", "us", "cn", "hk", "forex"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`min-w-10 cursor-pointer truncate rounded px-1.5 py-0.5 text-center transition-all duration-150 ${
                filter === cat ? "bg-[#071f36] text-blue-200/75 ring-1 ring-blue-600/25" : "hover:text-white"
              }`}
            >
              {categoryTranslationMap[cat]}
            </button>
          ))}
        </div>
        <div className="mt-2 flex h-7 items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2">
          <Search className="h-3 w-3 shrink-0 text-blue-300/75" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchAsset")}
            className="min-w-0 flex-1 bg-transparent text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
          <span className={`shrink-0 text-[8px] font-mono font-bold uppercase tracking-widest ${statusTone}`}>
            {matrixRows.length}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_58px_48px] gap-2 px-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-600">
          <span>{zh ? "标的 / 数据" : "Asset / Feed"}</span>
          <span className="text-right">Bias</span>
          <span className="text-right">Score</span>
        </div>
      </div>

      <div className="min-h-0 flex-grow overflow-y-auto border-y border-slate-900 bg-slate-950/95">
        {matrixRows.map(({ sym, feedState, intelligence, setup, isFavorite }) => {
          const isSelected = sym.id === currentSymbol.id;
          const isUp = sym.change24h >= 0;
          const feedTone = feedToneMap[feedState];
          const sourceLabel = isSelected && marketStatus?.source
            ? marketStatus.source
            : sym.lastSource || sym.dataProvider || sym.exchange || sym.type;
          const favoriteLabel = isFavorite ? (zh ? "取消自选" : "Remove favorite") : (zh ? "加入自选" : "Add favorite");
          return (
            <button
              key={sym.id}
              onClick={() => {
                onSymbolSelect(sym);
                if (onClose) onClose();
              }}
              className={`group w-full border-b border-slate-900/90 px-2.5 py-2 text-left transition-all duration-150 ${
                isSelected
                  ? "bg-blue-500/20 shadow-[inset_2px_0_0_rgba(54,96,130,0.72)]"
                  : "hover:bg-slate-900/70"
              }`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_58px_48px] items-start gap-2">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={favoriteLabel}
                      title={favoriteLabel}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleFavorite?.(sym);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleFavorite?.(sym);
                      }}
                      className={`shrink-0 rounded p-0.5 transition-colors ${isFavorite ? "text-amber-300" : "text-slate-600 hover:text-amber-300"}`}
                    >
                      <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-amber-300" : "fill-transparent"}`} />
                    </span>
                    <span className="truncate text-[12px] font-black tracking-tight text-white">{sym.id}</span>
                    <span
                      title={`${sourceLabel} · ${feedState}`}
                      className={`shrink-0 rounded border px-1 py-[1px] font-mono text-[7px] font-black leading-none ${feedTone}`}
                    >
                      {feedLabelMap[feedState]}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[8px] text-slate-500">
                    {sym.name} · {sym.exchange || sym.market || sym.type}
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-900">
                    <div
                      className={`h-full rounded-full ${scoreBar(intelligence.score)}`}
                      style={{ width: `${Math.max(8, intelligence.score)}%` }}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-[11px] font-black ${biasTone(intelligence.bias)}`}>
                    {getBiasLabel(intelligence.bias, lang)}
                  </div>
                  <div className="mt-0.5 truncate text-[7px] font-black uppercase tracking-wider text-slate-600">
                    {setup}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-mono text-[15px] font-black leading-none ${scoreTone(intelligence.score)}`}>
                    {intelligence.score}
                  </div>
                  <div className={`mt-1 text-[8px] font-mono font-black ${isUp ? "text-emerald-300" : "text-rose-400"}`}>
                    {isUp ? "+" : ""}{sym.change24h.toFixed(1)}%
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {matrixRows.length === 0 && (
          <div className="px-4 py-12 text-center text-xs text-slate-600">
            {filter === "favorites" ? (zh ? "还没有自选，点资产旁边的星标加入。" : "No favorites yet. Use the star next to an asset.") : t("noAssetsFound")}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={desktopShell}>
        {content}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          ></div>
          <div className="relative flex h-full w-80 max-w-[85%] flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

function getSymbolFeedState(symbol: MarketSymbol, selected: boolean, marketStatus?: MarketDataStatus): MarketDataStatus["state"] {
  if (selected && marketStatus?.state) return marketStatus.state;
  if (symbol.lastDataState) return symbol.lastDataState;
  if (symbol.dataProvider === "binance" || symbol.dataProvider === "coinbase") return "live";
  if (["yahoo", "polygon", "twelve-data", "finnhub", "alpha-vantage"].includes(symbol.dataProvider || "")) return "delayed";
  return "simulated";
}

const feedToneMap = {
  live: "border-emerald-500/25 bg-emerald-500/20 text-emerald-300",
  delayed: "border-blue-500/20 bg-blue-500/10 text-blue-300/75",
  stale: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  error: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  simulated: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  loading: "border-blue-500/30 bg-blue-500/10 text-blue-300/70"
};

const feedLabelMap = {
  live: "LIVE",
  delayed: "DELAY",
  stale: "STALE",
  error: "ERR",
  simulated: "SIM",
  loading: "LOAD"
};

function scoreTone(score: number) {
  if (score >= 74) return "text-emerald-300";
  if (score >= 62) return "text-blue-300/70";
  if (score <= 38) return "text-rose-300";
  return "text-slate-300";
}

function scoreBar(score: number) {
  if (score >= 74) return "bg-emerald-300";
  if (score >= 62) return "bg-blue-500/25";
  if (score <= 38) return "bg-rose-300";
  return "bg-slate-500";
}

function biasTone(bias: PrismIntelligence["bias"]) {
  if (bias === "long") return "text-emerald-300";
  if (bias === "short") return "text-rose-300";
  if (bias === "defense") return "text-amber-300";
  return "text-slate-400";
}
