import { DEFAULT_WATCHLIST_SYMBOLS, inferMarketSymbolFromInput, resolveMarketSymbol, sortMarketSymbols } from "@shared/marketCatalog";
import { StorageService } from "@shared/storage";
import type { MarketSymbol } from "@shared/types";

const WATCHLIST_SYMBOL_LIMIT = 120;

export function enrichMarketSymbol(symbol: MarketSymbol): MarketSymbol {
  const catalogSymbol = resolveMarketSymbol(symbol.symbol) ||
    resolveMarketSymbol(symbol.id) ||
    inferMarketSymbolFromInput(symbol.symbol) ||
    inferMarketSymbolFromInput(symbol.id);
  if (!catalogSymbol) return symbol;
  return {
    ...symbol,
    id: catalogSymbol.id,
    symbol: catalogSymbol.symbol,
    type: catalogSymbol.type,
    market: catalogSymbol.market,
    exchange: catalogSymbol.exchange,
    currency: catalogSymbol.currency,
    dataProvider: catalogSymbol.dataProvider,
    yahooSymbol: catalogSymbol.yahooSymbol,
    precision: catalogSymbol.precision
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

  return sortMarketSymbols(Array.from(merged.values())).slice(0, WATCHLIST_SYMBOL_LIMIT);
}
