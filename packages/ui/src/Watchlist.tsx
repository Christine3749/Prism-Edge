import { useEffect, useMemo, useState } from "react";
import { searchMarketSymbols } from "@shared/marketCatalog";
import { buildPrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import type { MarketSymbol } from "@shared/types";
import { useTranslation } from "@shared/translations";
import { WatchlistContent } from "./watchlist/WatchlistContent";
import { getFavoriteSyncMeta, getProviderMeta, getSymbolFeedState } from "./watchlist/providerMeta";
import { buildSearchSuggestions, getSearchInsight, matchesWatchlistSymbol } from "./watchlist/searchUtils";
import type { WatchlistFilter, WatchlistProps } from "./watchlist/types";
import { CORE_WATCHLIST_FILTERS } from "./watchlist/types";

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
  onToggleFavorite,
  favoriteSyncState = "local"
}: WatchlistProps) {
  const t = useTranslation(lang);
  const zh = lang === "zh" || lang === "tc";
  const [filter, setFilter] = useState<WatchlistFilter>("all");
  const [query, setQuery] = useState("");
  const [remoteSymbols, setRemoteSymbols] = useState<MarketSymbol[]>([]);
  const [remoteSearchLoading, setRemoteSearchLoading] = useState(false);
  const favoriteSet = useMemo(() => new Set(favoriteSymbols), [favoriteSymbols]);
  const normalizedQuery = query.trim();

  const categoryTranslationMap: Record<string, string> = {
    all: t("allMarkets"),
    favorites: zh ? "自选" : "Fav",
    crypto: "Crypto",
    us: zh ? "美股" : "US",
    cn: zh ? "A股" : "A-Share",
    hk: zh ? "港股" : "HK",
    forex: zh ? "外汇" : "FX",
    eu: zh ? "欧洲" : "Europe",
    jp: zh ? "日本" : "Japan",
    au: zh ? "澳洲" : "Australia"
  };

  const availableFilters = useMemo<WatchlistFilter[]>(() => {
    const coreFilters = new Set<string>(CORE_WATCHLIST_FILTERS);
    const dynamicMarkets = [...symbolsList, ...remoteSymbols]
      .map((sym) => (sym.market || sym.type || "").toLowerCase())
      .filter((market) => market && market !== "stock" && !coreFilters.has(market));
    return [...CORE_WATCHLIST_FILTERS, ...Array.from(new Set(dynamicMarkets)).sort()];
  }, [remoteSymbols, symbolsList]);

  useEffect(() => {
    if (normalizedQuery.length < 2 || filter === "favorites") {
      setRemoteSymbols([]);
      setRemoteSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const market = filter !== "all" && filter !== "favorites" ? filter : "all";
    setRemoteSearchLoading(true);

    const timeout = window.setTimeout(() => {
      void fetch(`/api/market/search?q=${encodeURIComponent(normalizedQuery)}&market=${encodeURIComponent(market)}&limit=80`, {
        signal: controller.signal
      })
        .then((response) => response.ok ? response.json() : { results: [] })
        .then((payload) => {
          if (controller.signal.aborted) return;
          setRemoteSymbols(Array.isArray(payload?.results) ? payload.results : []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemoteSymbols([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setRemoteSearchLoading(false);
        });
    }, 120);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [filter, normalizedQuery]);

  const filteredSymbols = useMemo(() => {
    const normalizedQueryLower = normalizedQuery.toLowerCase();
    const matches = (sym: MarketSymbol) => matchesWatchlistSymbol(sym, filter, favoriteSet, normalizedQueryLower);
    const localMatches = symbolsList.filter(matches);

    if (!normalizedQueryLower || filter === "favorites") return localMatches;

    const catalogFilter = filter !== "favorites" ? filter : "all";
    const catalogMatches = searchMarketSymbols(query, catalogFilter === "favorites" ? "all" : catalogFilter, 60).filter(matches);
    const remoteMatches = remoteSymbols.filter(matches);
    const merged = new Map<string, MarketSymbol>();
    localMatches.forEach((symbol) => merged.set(symbol.symbol, symbol));
    catalogMatches.forEach((symbol) => merged.set(symbol.symbol, symbol));
    remoteMatches.forEach((symbol) => merged.set(symbol.symbol, symbol));
    return Array.from(merged.values());
  }, [favoriteSet, filter, normalizedQuery, query, remoteSymbols, symbolsList]);

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
  const favoriteSyncMeta = getFavoriteSyncMeta(favoriteSyncState, zh);
  const providerMeta = getProviderMeta(marketStatus, zh);
  const searchInsight = getSearchInsight(filteredSymbols, normalizedQuery, remoteSearchLoading, zh);
  const searchSuggestions = useMemo(() => buildSearchSuggestions(normalizedQuery, filteredSymbols), [filteredSymbols, normalizedQuery]);
  const quickAddSymbol = normalizedQuery ? filteredSymbols.find((symbol) => !favoriteSet.has(symbol.symbol)) : undefined;
  const showFavoriteSyncNotice = filter === "favorites" || favoriteSymbols.length > 0 || favoriteSyncState !== "local";

  const desktopShell = compressed
    ? "pointer-events-none hidden h-full w-0 min-w-0 shrink-0 overflow-hidden border-l border-transparent bg-slate-950/0 p-0 opacity-0 transition-[width,min-width,opacity,padding,border-color] duration-500 md:flex xl:w-0 xl:min-w-0"
    : "hidden h-full w-[292px] min-w-[292px] shrink-0 border-l border-slate-800 bg-slate-950/80 p-2 opacity-100 transition-[width,min-width,opacity,padding,border-color] duration-500 md:flex xl:w-[324px] xl:min-w-[324px]";

  const content = (
    <WatchlistContent
      availableFilters={availableFilters}
      categoryTranslationMap={categoryTranslationMap}
      currentSymbol={currentSymbol}
      favoriteSyncMeta={favoriteSyncMeta}
      filteredCount={filteredSymbols.length}
      lang={lang}
      marketStatus={marketStatus}
      matrixRows={matrixRows}
      noAssetsText={t("noAssetsFound")}
      normalizedQuery={normalizedQuery}
      onClose={onClose}
      onFilterChange={setFilter}
      onQueryChange={setQuery}
      onSymbolSelect={onSymbolSelect}
      onToggleFavorite={onToggleFavorite}
      providerMeta={providerMeta}
      query={query}
      quickAddSymbol={quickAddSymbol}
      remoteSearchLoading={remoteSearchLoading}
      searchInsight={searchInsight}
      searchPlaceholder={t("searchAsset")}
      searchSuggestions={searchSuggestions}
      selectedFilter={filter}
      showFavoriteSyncNotice={showFavoriteSyncNotice}
      statusTone={statusTone}
      zh={zh}
    />
  );

  return (
    <>
      <div className={desktopShell}>{content}</div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
          <div className="relative flex h-full w-80 max-w-[85%] flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}