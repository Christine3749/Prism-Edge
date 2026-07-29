import { useCallback, useEffect, useRef } from "react";
import { inferMarketSymbolFromInput, resolveMarketSymbol } from "@shared/marketCatalog";
import type { MarketSymbol } from "@shared/types";
import { enrichMarketSymbol } from "../services/watchlistStorage";

interface DesktopSymbolSyncParams {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  onSymbolSelect: (symbol: MarketSymbol) => void;
}

type DesktopBridge = {
  getState?: () => Promise<{ symbol?: DesktopSymbolPayload }>;
  publishSymbol?: (payload: DesktopSymbolPayload) => void;
  onSymbol?: (handler: (payload: DesktopSymbolPayload) => void) => () => void;
};

type DesktopSymbolPayload = Partial<MarketSymbol> & {
  id?: string;
  symbol?: string;
};

export function useDesktopSymbolSync({ currentSymbol, symbolsList, onSymbolSelect }: DesktopSymbolSyncParams) {
  const hydratedRef = useRef(false);
  const lastPublishedRef = useRef("");
  const initialSymbolKeyRef = useRef(currentSymbol.symbol || currentSymbol.id);
  const currentSymbolRef = useRef(currentSymbol);
  const symbolsListRef = useRef(symbolsList);
  const onSymbolSelectRef = useRef(onSymbolSelect);
  const currentSymbolKey = currentSymbol.symbol || currentSymbol.id;

  currentSymbolRef.current = currentSymbol;
  symbolsListRef.current = symbolsList;
  onSymbolSelectRef.current = onSymbolSelect;

  const applyRemoteSymbol = useCallback((payload?: DesktopSymbolPayload) => {
    const remoteSymbol = resolveRemoteSymbol(payload, symbolsListRef.current);
    if (!remoteSymbol) return false;

    const remoteKey = remoteSymbol.symbol || remoteSymbol.id;
    lastPublishedRef.current = remoteKey;
    const activeSymbol = currentSymbolRef.current;
    if (remoteKey !== (activeSymbol.symbol || activeSymbol.id)) {
      onSymbolSelectRef.current(remoteSymbol);
    }
    return true;
  }, []);

  useEffect(() => {
    const desktop = getDesktopBridge();
    if (!desktop) return;
    let active = true;
    let receivedRemoteUpdate = false;
    const unsubscribe = desktop.onSymbol?.((payload) => {
      receivedRemoteUpdate = true;
      applyRemoteSymbol(payload);
    });

    const hydrate = async () => {
      let restored = false;
      try {
        const state = await desktop.getState?.();
        if (!active) return;
        const currentKey = currentSymbolRef.current.symbol || currentSymbolRef.current.id;
        const hasPendingLocalSelection = currentKey !== initialSymbolKeyRef.current;
        hydratedRef.current = true;
        if (!hasPendingLocalSelection && !receivedRemoteUpdate) {
          restored = applyRemoteSymbol(state?.symbol);
        }
      } catch {
        if (!active) return;
        hydratedRef.current = true;
      }

      if (!restored && !receivedRemoteUpdate) {
        publishCurrentSymbol(desktop, currentSymbolRef.current, lastPublishedRef);
      }
    };

    void hydrate();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [applyRemoteSymbol]);

  useEffect(() => {
    const desktop = getDesktopBridge();
    if (!desktop || !hydratedRef.current) return;
    publishCurrentSymbol(desktop, currentSymbol, lastPublishedRef);
  }, [currentSymbol, currentSymbolKey]);
}

function publishCurrentSymbol(
  desktop: DesktopBridge,
  symbol: MarketSymbol,
  lastPublishedRef: { current: string },
) {
  if (!desktop.publishSymbol) return;
  const symbolKey = symbol.symbol || symbol.id;
  if (lastPublishedRef.current === symbolKey) return;
  lastPublishedRef.current = symbolKey;
  desktop.publishSymbol(toDesktopSymbolPayload(symbol));
}

function getDesktopBridge(): DesktopBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { prismDesktop?: DesktopBridge }).prismDesktop;
}

function resolveRemoteSymbol(payload: DesktopSymbolPayload | undefined, symbolsList: MarketSymbol[]) {
  const key = payload?.symbol || payload?.id;
  if (!key) return null;

  const existing = symbolsList.find((symbol) => symbol.symbol === key || symbol.id === key);
  if (existing) return existing;

  const catalog = resolveMarketSymbol(key) || inferMarketSymbolFromInput(key);
  if (catalog) return enrichMarketSymbol(catalog);

  if (!payload.id || !payload.symbol || !payload.name || !payload.type) return null;
  return enrichMarketSymbol(payload as MarketSymbol);
}

function toDesktopSymbolPayload(symbol: MarketSymbol): DesktopSymbolPayload {
  return {
    id: symbol.id,
    symbol: symbol.symbol,
    name: symbol.name,
    type: symbol.type,
    market: symbol.market,
    exchange: symbol.exchange,
    currency: symbol.currency,
    dataProvider: symbol.dataProvider,
    yahooSymbol: symbol.yahooSymbol,
    price: symbol.price,
    change24h: symbol.change24h,
    volume24h: symbol.volume24h,
    precision: symbol.precision,
  };
}
