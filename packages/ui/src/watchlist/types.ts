import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import type { PrismIntelligence } from "@shared/prismIntelligence";

export type FavoriteSyncState = "local" | "syncing" | "synced" | "verified" | "error";

export interface WatchlistProps {
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
  favoriteSyncState?: FavoriteSyncState;
}

export type CoreWatchlistFilter = "all" | "favorites" | "crypto" | "us" | "cn" | "hk" | "forex";
export type WatchlistFilter = CoreWatchlistFilter | (string & {});

export const CORE_WATCHLIST_FILTERS: CoreWatchlistFilter[] = ["all", "favorites", "crypto", "us", "cn", "hk", "forex"];

export interface WatchlistMatrixRow {
  sym: MarketSymbol;
  feedState: MarketDataStatus["state"];
  intelligence: PrismIntelligence;
  setup: string;
  isFavorite: boolean;
}

export interface FavoriteSyncMeta {
  label: string;
  detail: string;
  className: string;
}

export interface ProviderMeta {
  stateLabel: string;
  routeText: string;
  routeShort: string;
  tooltip: string;
}
