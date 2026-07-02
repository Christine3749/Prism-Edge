import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { inferMarketSymbolFromInput, resolveMarketSymbol, sortMarketSymbols } from "@shared/marketCatalog";
import { StorageService } from "@shared/storage";
import type { MarketSymbol } from "@shared/types";
import {
  hasCloudFavoriteSession,
  loadCloudFavoriteSymbols,
  mergeFavoriteSymbols,
  saveCloudFavoriteSymbols,
  verifyCloudFavoriteSymbols
} from "../services/favoriteSync";
import { enrichMarketSymbol } from "../services/watchlistStorage";

export type FavoriteSyncState = "local" | "syncing" | "synced" | "verified" | "error";

export function useFavoriteCloudSync(setSymbolsList: Dispatch<SetStateAction<MarketSymbol[]>>) {
  const [favoriteSymbols, setFavoriteSymbols] = useState<string[]>(() => StorageService.loadFavoriteSymbols([]));
  const [favoriteSyncState, setFavoriteSyncState] = useState<FavoriteSyncState>(() => hasCloudFavoriteSession() ? "syncing" : "local");

  const syncFavoriteSymbolsToCloud = useCallback((symbols: string[]) => {
    if (!hasCloudFavoriteSession()) {
      setFavoriteSyncState("local");
      return;
    }
    setFavoriteSyncState("syncing");
    void saveCloudFavoriteSymbols(symbols)
      .then(async (result) => {
        if (!result.signedIn) {
          setFavoriteSyncState("local");
          return;
        }
        setFavoriteSyncState("synced");
        const replay = await verifyCloudFavoriteSymbols(result.symbols);
        setFavoriteSyncState(replay.signedIn && replay.verified ? "verified" : "error");
      })
      .catch((error) => {
        setFavoriteSyncState("error");
        console.warn("Favorite cloud sync save failed.", error);
      });
  }, []);

  useEffect(() => {
    if (!hasCloudFavoriteSession()) {
      setFavoriteSyncState("local");
      return;
    }

    setFavoriteSyncState("syncing");

    const controller = new AbortController();
    let cancelled = false;

    void loadCloudFavoriteSymbols(controller.signal)
      .then((cloud) => {
        if (cancelled) return;
        if (!cloud.signedIn) {
          setFavoriteSyncState("local");
          return;
        }
        const localSymbols = StorageService.loadFavoriteSymbols([]);
        const merged = mergeFavoriteSymbols(cloud.symbols, localSymbols);
        StorageService.saveFavoriteSymbols(merged);
        addKnownFavoriteSymbolsToWatchlist(merged, setSymbolsList);
        setFavoriteSymbols(merged);
        if (merged.join("|") !== cloud.symbols.join("|")) {
          syncFavoriteSymbolsToCloud(merged);
          return;
        }
        setFavoriteSyncState("synced");
        void verifyCloudFavoriteSymbols(merged, controller.signal)
          .then((replay) => {
            if (cancelled) return;
            setFavoriteSyncState(replay.signedIn && replay.verified ? "verified" : "synced");
          })
          .catch((error) => {
            if (!controller.signal.aborted) {
              setFavoriteSyncState("error");
              console.warn("Favorite cloud replay verification failed.", error);
            }
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setFavoriteSyncState("error");
          console.warn("Favorite cloud sync load failed.", error);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [setSymbolsList, syncFavoriteSymbolsToCloud]);

  const handleToggleFavorite = useCallback((symbol: MarketSymbol) => {
    const hydrated = enrichMarketSymbol(symbol);
    setSymbolsList((prev) => {
      if (prev.some((item) => item.symbol === hydrated.symbol)) return prev;
      return [hydrated, ...prev].slice(0, 120);
    });
    setFavoriteSymbols((prev) => {
      const next = prev.includes(hydrated.symbol)
        ? prev.filter((item) => item !== hydrated.symbol)
        : [...prev, hydrated.symbol];
      StorageService.saveFavoriteSymbols(next);
      syncFavoriteSymbolsToCloud(next);
      return next;
    });
  }, [setSymbolsList, syncFavoriteSymbolsToCloud]);

  return {
    favoriteSymbols,
    favoriteSyncState,
    setFavoriteSymbols,
    handleToggleFavorite,
    syncFavoriteSymbolsToCloud
  };
}

function addKnownFavoriteSymbolsToWatchlist(
  favoriteSymbols: string[],
  setSymbolsList: Dispatch<SetStateAction<MarketSymbol[]>>
) {
  setSymbolsList((prev) => {
    const merged = new Map(prev.map((symbol) => [symbol.symbol, symbol] as const));
    favoriteSymbols.forEach((symbol) => {
      if (merged.has(symbol)) return;
      const resolved = resolveMarketSymbol(symbol) || inferMarketSymbolFromInput(symbol);
      if (resolved) {
        merged.set(resolved.symbol, enrichMarketSymbol(resolved));
      }
    });
    return sortMarketSymbols(Array.from(merged.values())).slice(0, 120);
  });
}