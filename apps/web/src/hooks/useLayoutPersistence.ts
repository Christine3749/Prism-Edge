import { useEffect, useRef } from "react";
import { StorageService } from "@shared/storage";
import type { AppSettings, DrawingBase, IndicatorConfig, MarketSymbol } from "@shared/types";
import {
  getWatchlistStorageKey,
  stripVolatileSymbolFields
} from "../services/watchlistStorage";

interface LayoutPersistenceParams {
  drawings: DrawingBase[];
  indicatorConfig: IndicatorConfig;
  settings: AppSettings;
  symbolsList: MarketSymbol[];
}

export function useLayoutPersistence({
  drawings,
  indicatorConfig,
  settings,
  symbolsList
}: LayoutPersistenceParams) {
  const watchlistStorageKeyRef = useRef("");

  useEffect(() => {
    const storageKey = getWatchlistStorageKey(symbolsList);
    if (watchlistStorageKeyRef.current === storageKey) return;

    watchlistStorageKeyRef.current = storageKey;
    StorageService.saveWatchlist(symbolsList.map(stripVolatileSymbolFields));
  }, [symbolsList]);

  useEffect(() => {
    if (settings.autoSaveLayout) StorageService.saveDrawings(drawings);
  }, [drawings, settings.autoSaveLayout]);

  useEffect(() => {
    if (settings.autoSaveLayout) StorageService.saveIndicators(indicatorConfig);
  }, [indicatorConfig, settings.autoSaveLayout]);

  useEffect(() => {
    if (settings.autoSaveLayout) StorageService.saveSettings(settings);
  }, [settings, settings.autoSaveLayout]);
}
