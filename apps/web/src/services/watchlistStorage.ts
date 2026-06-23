import { DEFAULT_WATCHLIST_SYMBOLS, resolveMarketSymbol, sortMarketSymbols } from "@shared/marketCatalog";
import { StorageService } from "@shared/storage";
import type { MarketSymbol } from "@shared/types";

export function enrichMarketSymbol(symbol: MarketSymbol): MarketSymbol {
  const catalogSymbol = resolveMarketSymbol(symbol.symbol) || resolveMarketSymbol(symbol.id);
  if (!catalogSymbol) return symbol;
  return {
    ...catalogSymbol,
    ...symbol,
    market: symbol.market || catalogSymbol.market,
    exchange: symbol.exchange || catalogSymbol.exchange,
    currency: symbol.currency || catalogSymbol.currency,
    dataProvider: symbol.dataProvider || catalogSymbol.dataProvider,
    yahooSymbol: symbol.yahooSymbol || catalogSymbol.yahooSymbol
  };
}

export function stripVolatileSymbolFields(symbol: MarketSymbol): MarketSymbol {
  const { lastSource, lastDataState, lastUpdatedAt, ...stableSymbol } = symbol;
  return stableSymbol;
}

export function getWatchlistStorageKey(symbols: MarketSymbol[]) {
  return symbols.map((symbol) => symbol.symbol).join("|");
}

export function loadHydratedWatchlist() {
  const savedSymbols = StorageService.loadWatchlist(DEFAULT_WATCHLIST_SYMBOLS) as MarketSymbol[];
  const merged = new Map<string, MarketSymbol>();

  DEFAULT_WATCHLIST_SYMBOLS.forEach((symbol) => {
    merged.set(symbol.symbol, { ...symbol });
  });

  savedSymbols.map(enrichMarketSymbol).forEach((symbol) => {
    merged.set(symbol.symbol, symbol);
  });

  return sortMarketSymbols(Array.from(merged.values())).slice(0, 60);
}
