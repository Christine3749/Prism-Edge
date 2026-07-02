import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import { WatchlistHeader } from "./WatchlistHeader";
import { WatchlistRows } from "./WatchlistRows";
import type { FavoriteSyncMeta, ProviderMeta, WatchlistFilter, WatchlistMatrixRow } from "./types";

interface WatchlistContentProps {
  availableFilters: WatchlistFilter[];
  categoryTranslationMap: Record<string, string>;
  currentSymbol: MarketSymbol;
  favoriteSyncMeta: FavoriteSyncMeta;
  filteredCount: number;
  lang: Language;
  marketStatus?: MarketDataStatus;
  matrixRows: WatchlistMatrixRow[];
  noAssetsText: string;
  normalizedQuery: string;
  onClose?: () => void;
  onFilterChange: (filter: WatchlistFilter) => void;
  onQueryChange: (query: string) => void;
  onSymbolSelect: (symbol: MarketSymbol) => void;
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

export function WatchlistContent(props: WatchlistContentProps) {
  return (
    <div className="flex h-full w-full select-none flex-col overflow-hidden rounded-md border border-slate-800/80 bg-slate-950/95 text-slate-200 shadow-[inset_0_1px_0_rgba(148,163,184,0.05)]">
      <WatchlistHeader {...props} matrixCount={props.matrixRows.length} />
      <WatchlistRows
        currentSymbol={props.currentSymbol}
        favoriteSyncMeta={props.favoriteSyncMeta}
        lang={props.lang}
        marketStatus={props.marketStatus}
        matrixRows={props.matrixRows}
        noAssetsText={props.noAssetsText}
        normalizedQuery={props.normalizedQuery}
        onClose={props.onClose}
        onSymbolSelect={props.onSymbolSelect}
        onToggleFavorite={props.onToggleFavorite}
        selectedFilter={props.selectedFilter}
        zh={props.zh}
      />
    </div>
  );
}
