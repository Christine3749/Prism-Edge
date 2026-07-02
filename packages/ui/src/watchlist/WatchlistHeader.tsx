import { Radio, Search, Star, X } from "lucide-react";
import type { MarketSymbol } from "@shared/types";
import { DraggableTabRail } from "./DraggableTabRail";
import { getMarketDisplayName } from "./providerMeta";
import { getSymbolMatchReason } from "./searchUtils";
import type { FavoriteSyncMeta, ProviderMeta, WatchlistFilter } from "./types";

interface WatchlistHeaderProps {
  availableFilters: WatchlistFilter[];
  categoryTranslationMap: Record<string, string>;
  favoriteSyncMeta: FavoriteSyncMeta;
  filteredCount: number;
  matrixCount: number;
  normalizedQuery: string;
  onClose?: () => void;
  onFilterChange: (filter: WatchlistFilter) => void;
  onQueryChange: (query: string) => void;
  onToggleFavorite?: (symbol: MarketSymbol) => void;
  providerMeta: ProviderMeta;
  query: string;
  quickAddSymbol?: MarketSymbol;
  remoteSearchLoading: boolean;
  searchInsight: { marketLabel: string; detail: string; reason: string } | null;
  searchPlaceholder: string;
  searchSuggestions: MarketSymbol[];
  selectedFilter: WatchlistFilter;
  showFavoriteSyncNotice: boolean;
  statusTone: string;
  zh: boolean;
}

export function WatchlistHeader({
  availableFilters,
  categoryTranslationMap,
  favoriteSyncMeta,
  filteredCount,
  matrixCount,
  normalizedQuery,
  onClose,
  onFilterChange,
  onQueryChange,
  onToggleFavorite,
  providerMeta,
  query,
  quickAddSymbol,
  remoteSearchLoading,
  searchInsight,
  searchPlaceholder,
  searchSuggestions,
  selectedFilter,
  showFavoriteSyncNotice,
  statusTone,
  zh
}: WatchlistHeaderProps) {
  return (
    <div className="shrink-0 border-b border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-blue-300/70">
            <Radio className="h-4 w-4" />
            <h3 className="truncate text-[11px] font-black uppercase tracking-[0.22em]">PRISM SIGNAL MATRIX</h3>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-slate-500">
            {zh ? "唯一资产排序区 / 谁更值得看" : "Single asset ranking surface / what deserves attention"}
          </p>
        </div>
        <div className="shrink-0 text-right font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">
          <div className={statusTone} title={providerMeta.tooltip}>{providerMeta.stateLabel}</div>
          <div className="mt-1 max-w-[96px] truncate text-blue-300/55" title={providerMeta.routeText}>{providerMeta.routeShort}</div>
          <div className={`mt-1 ${favoriteSyncMeta.className}`} title={favoriteSyncMeta.detail}>{favoriteSyncMeta.label}</div>
          <div className="mt-1">{filteredCount} assets</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-900 hover:text-white md:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <DraggableTabRail>
        {availableFilters.map((cat) => (
          <button
            key={cat}
            data-watchlist-tab={cat}
            data-active={selectedFilter === cat ? "true" : "false"}
            onClick={() => onFilterChange(cat)}
            className={`h-full min-w-[76px] shrink-0 cursor-pointer whitespace-nowrap rounded px-3 text-center transition-colors duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300/35 ${
              selectedFilter === cat ? "bg-slate-800/35 text-slate-100" : "text-slate-400 hover:bg-slate-900/25 hover:text-slate-100"
            }`}
          >
            {categoryTranslationMap[cat] || cat.toUpperCase()}
          </button>
        ))}
      </DraggableTabRail>

      <div className="mt-2 flex h-7 items-center gap-1.5 rounded border border-slate-800 bg-slate-950 px-2">
        <Search className="h-3 w-3 shrink-0 text-blue-300/75" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none"
        />
        <span className={`shrink-0 text-[8px] font-mono font-bold uppercase tracking-widest ${statusTone}`}>
          {remoteSearchLoading ? "..." : matrixCount}
        </span>
      </div>

      <SearchInsightBlock
        favoriteSyncMeta={favoriteSyncMeta}
        onToggleFavorite={onToggleFavorite}
        quickAddSymbol={quickAddSymbol}
        searchInsight={searchInsight}
        zh={zh}
      />
      <SearchSuggestions
        favoriteSyncMeta={favoriteSyncMeta}
        normalizedQuery={normalizedQuery}
        onFilterChange={onFilterChange}
        onQueryChange={onQueryChange}
        onToggleFavorite={onToggleFavorite}
        searchSuggestions={searchSuggestions}
        zh={zh}
      />

      {showFavoriteSyncNotice && (
        <div data-watchlist-sync-note className="mt-1 flex items-center justify-between gap-2 rounded border border-slate-800/60 bg-slate-950/35 px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-slate-600" title={favoriteSyncMeta.detail}>
          <span>{zh ? "自选" : "Favorites"} · <span className={favoriteSyncMeta.className}>{favoriteSyncMeta.label}</span></span>
          <span className="max-w-[120px] truncate text-blue-300/45" title={providerMeta.tooltip}>{providerMeta.routeShort}</span>
        </div>
      )}
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_58px_48px] gap-2 px-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-600">
        <span>{zh ? "标的 / 数据" : "Asset / Feed"}</span>
        <span className="text-right">Bias</span>
        <span className="text-right">Score</span>
      </div>
    </div>
  );
}

function SearchInsightBlock({
  favoriteSyncMeta,
  onToggleFavorite,
  quickAddSymbol,
  searchInsight,
  zh
}: Pick<WatchlistHeaderProps, "favoriteSyncMeta" | "onToggleFavorite" | "quickAddSymbol" | "searchInsight" | "zh">) {
  if (!searchInsight) return null;
  return (
    <div data-watchlist-search-insight className="mt-1.5 rounded border border-slate-800/70 bg-slate-950/55 px-2 py-1.5 text-[8px] font-bold text-slate-500">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded border border-blue-400/20 bg-blue-400/10 px-1.5 py-0.5 text-blue-200/85">{searchInsight.marketLabel}</span>
            <span className="truncate text-slate-400">{searchInsight.detail}</span>
          </div>
          <div className="mt-0.5 truncate font-mono text-[7px] font-bold uppercase tracking-wider text-slate-600" title={searchInsight.reason}>{searchInsight.reason}</div>
        </div>
        {quickAddSymbol && onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(quickAddSymbol)}
            className="shrink-0 cursor-pointer rounded border border-amber-400/25 px-1.5 py-0.5 text-[8px] font-black text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-400/10"
            title={favoriteSyncMeta.detail}
          >
            {zh ? "加自选" : "Add"}
          </button>
        )}
      </div>
    </div>
  );
}

function SearchSuggestions({
  favoriteSyncMeta,
  normalizedQuery,
  onFilterChange,
  onQueryChange,
  onToggleFavorite,
  searchSuggestions,
  zh
}: Pick<WatchlistHeaderProps, "favoriteSyncMeta" | "normalizedQuery" | "onFilterChange" | "onQueryChange" | "onToggleFavorite" | "searchSuggestions" | "zh">) {
  if (searchSuggestions.length === 0) return null;
  return (
    <div data-watchlist-suggestions className="mt-1 flex flex-wrap gap-1 text-[8px] font-bold text-slate-500">
      <span className="px-0.5 py-1 text-slate-600">{zh ? "建议后缀" : "Try suffix"}</span>
      {searchSuggestions.map((suggestion) => {
        const suggestionMarket = getMarketDisplayName(suggestion.market || suggestion.type, zh);
        const suggestionReason = getSymbolMatchReason(suggestion, normalizedQuery, zh);
        return (
          <span key={suggestion.symbol} className="inline-flex overflow-hidden rounded border border-slate-800 bg-slate-900/70">
            <button
              type="button"
              onClick={() => {
                onFilterChange((suggestion.market || suggestion.type || "all") as WatchlistFilter);
                onQueryChange(suggestion.id);
              }}
              className="cursor-pointer px-1.5 py-1 font-mono text-blue-200/75 transition hover:bg-blue-500/10 hover:text-blue-100"
              title={suggestionReason}
            >
              <span>{suggestion.id}</span>
              <span className="ml-1 text-slate-500">{suggestionMarket}</span>
            </button>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(suggestion)}
                className="cursor-pointer border-l border-slate-800 px-1 text-amber-300/80 transition hover:bg-amber-400/10 hover:text-amber-200"
                title={favoriteSyncMeta.detail}
              >
                <Star className="h-3 w-3" />
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
