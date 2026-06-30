import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Radio, Search, Star, X } from "lucide-react";
import { inferMarketSymbolForMarket, searchMarketSymbols } from "../../shared/src/marketCatalog";
import { buildPrismIntelligence, describePrismIntelligence, getBiasLabel, type PrismIntelligence } from "../../shared/src/prismIntelligence";
import { MarketDataStatus, MarketSymbol } from "../../shared/src/types";
import { Language, useTranslation } from "../../shared/src/translations";

type FavoriteSyncState = "local" | "syncing" | "synced" | "verified" | "error";

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
  favoriteSyncState?: FavoriteSyncState;
}

type CoreWatchlistFilter = "all" | "favorites" | "crypto" | "us" | "cn" | "hk" | "forex";
type WatchlistFilter = CoreWatchlistFilter | (string & {});
const CORE_WATCHLIST_FILTERS: CoreWatchlistFilter[] = ["all", "favorites", "crypto", "us", "cn", "hk", "forex"];

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
    const market = CORE_WATCHLIST_FILTERS.includes(filter as CoreWatchlistFilter) && filter !== "all" && filter !== "favorites"
      ? filter
      : "all";
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

    const catalogFilter = CORE_WATCHLIST_FILTERS.includes(filter as CoreWatchlistFilter) ? filter : "all";
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
  const quickAddSymbol = normalizedQuery
    ? filteredSymbols.find((symbol) => !favoriteSet.has(symbol.symbol))
    : undefined;

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
            <div className={statusTone} title={providerMeta.tooltip}>{providerMeta.stateLabel}</div>
            <div className="mt-1 max-w-[96px] truncate text-blue-300/55" title={providerMeta.routeText}>{providerMeta.routeShort}</div>
            <div className={`mt-1 ${favoriteSyncMeta.className}`} title={favoriteSyncMeta.detail}>{favoriteSyncMeta.label}</div>
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

        <DraggableTabRail activeKey={filter}>
          {availableFilters.map((cat) => (
            <button
              key={cat}
              data-watchlist-tab={cat}
              onClick={() => setFilter(cat)}
              className={`h-full min-w-[76px] shrink-0 snap-center cursor-pointer whitespace-nowrap rounded-sm px-3 text-center transition-[background-color,color,box-shadow] duration-100 active:brightness-125 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300/60 ${
                filter === cat ? "bg-[#071f36] text-blue-50 shadow-[inset_0_-1px_0_rgba(125,211,252,0.35)] ring-1 ring-blue-500/35" : "hover:bg-slate-800/75 hover:text-white"
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchAsset")}
            className="min-w-0 flex-1 bg-transparent text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
          <span className={`shrink-0 text-[8px] font-mono font-bold uppercase tracking-widest ${statusTone}`}>
            {remoteSearchLoading ? "..." : matrixRows.length}
          </span>
        </div>
        {searchInsight && (
          <div className="mt-1.5 flex min-h-6 items-center justify-between gap-2 rounded border border-slate-800/80 bg-slate-950/70 px-2 py-1 text-[8px] font-bold text-slate-500">
            <div className="min-w-0 truncate" title={searchInsight.reason}>
              <span className="text-blue-300/75">{searchInsight.marketLabel}</span>
              <span className="mx-1 text-slate-700">/</span>
              <span>{searchInsight.detail}</span>
            </div>
            {quickAddSymbol && onToggleFavorite && (
              <span
                role="button"
                tabIndex={0}
                onClick={() => onToggleFavorite(quickAddSymbol)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onToggleFavorite(quickAddSymbol);
                }}
                className="shrink-0 cursor-pointer rounded border border-amber-400/30 px-1.5 py-0.5 text-amber-200 transition hover:border-amber-300/70 hover:bg-amber-400/10"
                title={favoriteSyncMeta.detail}
              >
                {zh ? "加首项" : "Add first"}
              </span>
            )}
          </div>
        )}
        {searchSuggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 text-[8px] font-bold text-slate-500">
            <span className="px-0.5 py-1 text-slate-600">{zh ? "建议后缀" : "Try suffix"}</span>
            {searchSuggestions.map((suggestion) => (
              <span
                key={suggestion.symbol}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setFilter((suggestion.market || suggestion.type || "all") as WatchlistFilter);
                  setQuery(suggestion.id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setFilter((suggestion.market || suggestion.type || "all") as WatchlistFilter);
                  setQuery(suggestion.id);
                }}
                className="cursor-pointer rounded border border-slate-800 bg-slate-900/80 px-1.5 py-1 font-mono text-blue-200/75 transition hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-blue-100"
                title={getSymbolMatchReason(suggestion, normalizedQuery, zh)}
              >
                {suggestion.id}
              </span>
            ))}
          </div>
        )}
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
          const marketLabel = getMarketDisplayName(sym.market || sym.type, zh);
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
                    <span className="shrink-0 rounded border border-slate-800 bg-slate-900/70 px-1 py-[1px] font-mono text-[7px] font-black uppercase leading-none text-slate-500">
                      {marketLabel}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[8px] text-slate-500">
                    {sym.name} · {sym.exchange || sym.market || sym.type}
                  </div>
                  {normalizedQuery && !isFavorite && onToggleFavorite && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={favoriteLabel}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleFavorite(sym);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleFavorite(sym);
                      }}
                      className="mt-1 inline-flex cursor-pointer items-center rounded border border-amber-400/25 px-1.5 py-0.5 text-[7px] font-black text-amber-200 transition hover:border-amber-300/70 hover:bg-amber-400/10"
                      title={favoriteSyncMeta.detail}
                    >
                      {zh ? "加入自选" : "Add favorite"}
                    </span>
                  )}
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

type RailDragState = {
  active: boolean;
  dragging: boolean;
  pointerId: number;
  startX: number;
  lastX: number;
  lastTime: number;
  velocity: number;
};

const idleRailDragState: RailDragState = {
  active: false,
  dragging: false,
  pointerId: -1,
  startX: 0,
  lastX: 0,
  lastTime: 0,
  velocity: 0
};

function DraggableTabRail({ children, activeKey }: { children: ReactNode; activeKey: string }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<RailDragState>({ ...idleRailDragState });
  const suppressClickRef = useRef(false);
  const momentumFrameRef = useRef<number | null>(null);

  const stopMomentum = () => {
    if (momentumFrameRef.current === null) return;
    window.cancelAnimationFrame(momentumFrameRef.current);
    momentumFrameRef.current = null;
  };

  const resetDragState = () => {
    dragStateRef.current = { ...idleRailDragState };
  };

  const startMomentum = (velocity: number) => {
    const rail = railRef.current;
    if (!rail || Math.abs(velocity) < 0.04) return;

    let currentVelocity = velocity;
    let previousTime = window.performance.now();

    const glide = (now: number) => {
      const elapsed = Math.min(32, now - previousTime);
      previousTime = now;
      rail.scrollLeft -= currentVelocity * elapsed;
      currentVelocity *= Math.pow(0.9, elapsed / 16.67);

      if (Math.abs(currentVelocity) > 0.015) {
        momentumFrameRef.current = window.requestAnimationFrame(glide);
        return;
      }
      momentumFrameRef.current = null;
    };

    momentumFrameRef.current = window.requestAnimationFrame(glide);
  };

  useEffect(() => stopMomentum, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const activeTab = Array.from(rail.querySelectorAll<HTMLButtonElement>("[data-watchlist-tab]")).find((button) => button.dataset.watchlistTab === activeKey);
    activeTab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeKey, children]);

  return (
    <div className="relative mt-3">
      <div
        ref={railRef}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          const rail = railRef.current;
          if (!rail) return;
          stopMomentum();
          suppressClickRef.current = false;
          const now = window.performance.now();
          dragStateRef.current = {
            active: true,
            dragging: false,
            pointerId: event.pointerId,
            startX: event.clientX,
            lastX: event.clientX,
            lastTime: now,
            velocity: 0
          };
        }}
        onPointerMove={(event) => {
          const state = dragStateRef.current;
          const rail = railRef.current;
          if (!state.active || !rail) return;

          const totalDeltaX = event.clientX - state.startX;
          if (!state.dragging && Math.abs(totalDeltaX) <= 6) return;

          const now = window.performance.now();
          const frameDeltaX = event.clientX - state.lastX;
          const elapsed = Math.max(8, now - state.lastTime);

          if (!state.dragging) {
            state.dragging = true;
            suppressClickRef.current = true;
            rail.setPointerCapture?.(event.pointerId);
          }

          event.preventDefault();
          rail.scrollLeft -= frameDeltaX;
          state.velocity = frameDeltaX / elapsed;
          state.lastX = event.clientX;
          state.lastTime = now;
        }}
        onPointerUp={(event) => {
          const state = dragStateRef.current;
          const wasDragging = state.dragging;
          const velocity = state.velocity;
          const rail = railRef.current;

          if (rail && wasDragging && state.pointerId === event.pointerId) {
            rail.releasePointerCapture?.(event.pointerId);
          }

          resetDragState();
          if (!wasDragging) {
            suppressClickRef.current = false;
            return;
          }

          startMomentum(velocity);
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 140);
        }}
        onPointerCancel={(event) => {
          const state = dragStateRef.current;
          if (railRef.current && state.dragging && state.pointerId === event.pointerId) {
            railRef.current.releasePointerCapture?.(event.pointerId);
          }
          resetDragState();
          suppressClickRef.current = false;
        }}
        onPointerLeave={() => {
          const state = dragStateRef.current;
          if (state.dragging) return;
          resetDragState();
        }}
        onWheel={(event) => {
          const rail = railRef.current;
          if (!rail || rail.scrollWidth <= rail.clientWidth) return;
          const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
          if (Math.abs(delta) < 1) return;
          stopMomentum();
          rail.scrollLeft += delta;
          event.preventDefault();
        }}
        className="flex h-8 snap-x snap-mandatory scroll-px-4 cursor-grab touch-pan-x select-none gap-1 overflow-x-auto scroll-smooth rounded border border-slate-800 bg-slate-900/95 p-0.5 text-[9px] font-semibold text-slate-400 no-scrollbar [mask-image:linear-gradient(90deg,transparent,black_12px,black_calc(100%-12px),transparent)] active:cursor-grabbing"
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-4 rounded-l bg-gradient-to-r from-slate-900/95 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-4 rounded-r bg-gradient-to-l from-slate-900/95 to-transparent" />
    </div>
  );
}
function buildSearchSuggestions(query: string, symbols: MarketSymbol[]) {
  if (!query || symbols.length > 0) return [];

  const normalized = query.trim().toUpperCase().replace(/\s+/g, "");
  const candidates: Array<[string, string]> = [];

  if (/^\d{1,5}$/.test(normalized)) {
    candidates.push([`${normalized}.HK`, "hk"]);
  }
  if (/^\d{6}$/.test(normalized)) {
    candidates.push([`${normalized}.SS`, "cn"], [`${normalized}.SZ`, "cn"], [`${normalized}.BJ`, "cn"]);
  }
  if (/^[A-Z]{1,6}$/.test(normalized)) {
    candidates.push([normalized, "us"]);
    if (normalized.length >= 2) candidates.push([`${normalized}USDT`, "crypto"]);
  }
  if (/^[A-Z]{6}$/.test(normalized) || /^[A-Z]{3}\/[A-Z]{3}$/.test(normalized)) {
    candidates.push([normalized, "forex"]);
  }

  const suggestions = new Map<string, MarketSymbol>();
  candidates.forEach(([value, market]) => {
    const inferred = inferMarketSymbolForMarket(value, market);
    if (inferred && !suggestions.has(inferred.symbol)) {
      suggestions.set(inferred.symbol, inferred);
    }
  });

  return Array.from(suggestions.values()).slice(0, 4);
}
function getSearchInsight(symbols: MarketSymbol[], query: string, loading: boolean, zh: boolean) {
  if (!query) return null;
  if (loading) {
    return {
      marketLabel: zh ? "市场识别中" : "Detecting market",
      detail: zh ? "正在从本地目录和远程源补全" : "Local catalog and remote provider are searching",
      reason: zh ? "输入变化后先查本地目录，再请求远程市场搜索。" : "Input changes search local catalog first, then remote market search."
    };
  }

  const first = symbols[0];
  if (!first) {
    return {
      marketLabel: zh ? "未识别" : "No match",
      detail: zh ? "试试完整代码、后缀或英文名" : "Try full ticker, suffix, or name",
      reason: zh ? "没有命中本地/远程结果，下面会按代码形态建议可用后缀。" : "No local or remote match; suffix suggestions are based on ticker shape."
    };
  }

  const marketLabel = getMarketDisplayName(first.market || first.type, zh);
  const uniqueMarkets = new Set(symbols.map((symbol) => getMarketDisplayName(symbol.market || symbol.type, zh)));
  return {
    marketLabel: uniqueMarkets.size === 1 ? marketLabel : (zh ? "多市场" : "Multi-market"),
    detail: zh ? `${symbols.length} 个候选 · ${getSymbolMatchReason(first, query, zh)}` : `${symbols.length} candidates · ${getSymbolMatchReason(first, query, zh)}`,
    reason: getSymbolMatchReason(first, query, zh)
  };
}

function getSymbolMatchReason(symbol: MarketSymbol, query: string, zh: boolean) {
  const normalized = query.trim().toUpperCase().replace(/\s+/g, "");
  const market = (symbol.market || symbol.type || "").toLowerCase();
  const exchange = String(symbol.exchange || "").toUpperCase();

  if (market === "hk") {
    return zh
      ? (normalized.includes(".HK") ? "因 .HK 后缀识别为港股" : "因数字代码/HKEX 规则识别为港股")
      : (normalized.includes(".HK") ? "matched .HK suffix" : "matched HKEX numeric ticker rule");
  }
  if (market === "cn") {
    return zh
      ? (/(\.SS|\.SZ|\.BJ)$/.test(normalized) ? "因 A 股交易所后缀识别" : "因 6 位数字代码识别为 A 股")
      : (/(\.SS|\.SZ|\.BJ)$/.test(normalized) ? "matched China exchange suffix" : "matched 6-digit A-share ticker");
  }
  if (market === "forex") {
    return zh
      ? "因 6 位货币对或 XXX/YYY 结构识别为外汇"
      : "matched 6-letter currency pair or XXX/YYY format";
  }
  if (market === "crypto") {
    return zh
      ? "因 USDT/Binance 交易对规则识别为 Crypto"
      : "matched USDT/Binance crypto pair rule";
  }
  if (market === "us" || exchange === "NASDAQ" || exchange === "NYSE") {
    return zh
      ? "因美股代码形态或 NASDAQ/NYSE 结果识别"
      : "matched US ticker shape or NASDAQ/NYSE result";
  }
  return zh ? "由市场目录/远程搜索结果识别" : "identified by catalog or remote search";
}
function getProviderMeta(status: MarketDataStatus | undefined, zh: boolean) {
  const state = status?.state || "loading";
  const stateLabels: Record<MarketDataStatus["state"], string> = {
    loading: zh ? "连接中" : "loading",
    live: zh ? "真实源" : "live",
    delayed: zh ? "延迟源" : "delayed",
    simulated: zh ? "模拟保护" : "sim guard",
    stale: zh ? "源过期" : "stale",
    error: zh ? "源异常" : "offline"
  };
  const route = Array.isArray(status?.route) && status.route.length > 0
    ? status.route
    : [status?.source || "gateway"];
  const routeText = route.map(formatProviderName).join(" -> ");
  const routeShort = route.length > 2
    ? `${formatProviderName(route[0])} -> ${formatProviderName(route[route.length - 1])}`
    : routeText;
  const quality = status?.quality || "protected";
  const tooltip = [
    zh ? `Provider 链路: ${routeText}` : `Provider route: ${routeText}`,
    zh ? `质量: ${quality}` : `Quality: ${quality}`,
    status?.reason || status?.message || ""
  ].filter(Boolean).join("\n");
  return { stateLabel: stateLabels[state], routeText, routeShort, tooltip };
}

function formatProviderName(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("binance")) return "Binance";
  if (normalized.includes("coinbase")) return "Coinbase";
  if (normalized.includes("polygon")) return "Polygon";
  if (normalized.includes("twelve")) return "TwelveData";
  if (normalized.includes("finnhub")) return "Finnhub";
  if (normalized.includes("alpha")) return "AlphaV";
  if (normalized.includes("yahoo")) return "Yahoo";
  if (normalized.includes("sim")) return "Sim";
  if (normalized.includes("local")) return "Local";
  return value || "Gateway";
}

function getMarketDisplayName(market: string | undefined, zh: boolean) {
  const normalized = (market || "").toLowerCase();
  const labels: Record<string, { zh: string; en: string }> = {
    all: { zh: "全部", en: "ALL" },
    favorites: { zh: "自选", en: "FAV" },
    crypto: { zh: "Crypto", en: "CRYPTO" },
    us: { zh: "美股", en: "US" },
    cn: { zh: "A股", en: "CN" },
    hk: { zh: "港股", en: "HK" },
    forex: { zh: "外汇", en: "FX" },
    stock: { zh: "股票", en: "STOCK" },
    eu: { zh: "欧洲", en: "EU" },
    jp: { zh: "日本", en: "JP" },
    au: { zh: "澳洲", en: "AU" },
    internal: { zh: "内部", en: "INT" }
  };
  const label = labels[normalized];
  return label ? (zh ? label.zh : label.en) : normalized.toUpperCase();
}
function matchesWatchlistSymbol(
  sym: MarketSymbol,
  filter: WatchlistFilter,
  favoriteSet: Set<string>,
  normalizedQuery: string
) {
  const symbolMarket = (sym.market || sym.type || "").toLowerCase();
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
    sym.name.toLowerCase().includes(normalizedQuery) ||
    String(sym.exchange || "").toLowerCase().includes(normalizedQuery);
  return matchesFilter && matchesQuery;
}

function getFavoriteSyncMeta(state: FavoriteSyncState, zh: boolean) {
  switch (state) {
    case "verified":
      return { label: zh ? "云验证" : "verified", detail: zh ? "已保存并从云端回放验证一致。" : "Saved and replay-verified from cloud.", className: "text-emerald-200" };
    case "synced":
      return { label: zh ? "云同步" : "cloud", detail: zh ? "已登录，星标会同步到云端。" : "Signed in; favorites sync to cloud.", className: "text-emerald-300/80" };
    case "syncing":
      return { label: zh ? "同步中" : "syncing", detail: zh ? "正在同步自选列表。" : "Syncing favorites.", className: "text-blue-300/80" };
    case "error":
      return { label: zh ? "待重试" : "retry", detail: zh ? "云同步失败，本地自选已保留。" : "Cloud sync failed; local favorites are preserved.", className: "text-amber-300/85" };
    default:
      return { label: zh ? "未登录" : "signed out", detail: zh ? "未登录时保存在本机，登录后会自动合并并同步。" : "Stored locally until sign-in; then merged and synced.", className: "text-slate-500" };
  }
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





