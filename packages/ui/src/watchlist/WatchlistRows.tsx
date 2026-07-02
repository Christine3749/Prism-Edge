import { Star } from "lucide-react";
import { getBiasLabel } from "@shared/prismIntelligence";
import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import { getMarketDisplayName, getRowProviderMeta } from "./providerMeta";
import { getSymbolMatchReason } from "./searchUtils";
import { biasTone, feedLabelMap, feedToneMap, scoreBar, scoreTone } from "./toneClasses";
import type { FavoriteSyncMeta, WatchlistMatrixRow } from "./types";

interface WatchlistRowsProps {
  currentSymbol: MarketSymbol;
  favoriteSyncMeta: FavoriteSyncMeta;
  lang: Language;
  marketStatus?: MarketDataStatus;
  matrixRows: WatchlistMatrixRow[];
  noAssetsText: string;
  normalizedQuery: string;
  onClose?: () => void;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  onToggleFavorite?: (symbol: MarketSymbol) => void;
  selectedFilter: string;
  zh: boolean;
}

export function WatchlistRows({
  currentSymbol,
  favoriteSyncMeta,
  lang,
  marketStatus,
  matrixRows,
  noAssetsText,
  normalizedQuery,
  onClose,
  onSymbolSelect,
  onToggleFavorite,
  selectedFilter,
  zh
}: WatchlistRowsProps) {
  return (
    <div className="min-h-0 flex-grow overflow-y-auto border-y border-slate-900 bg-slate-950/95">
      {matrixRows.map(({ sym, feedState, intelligence, setup, isFavorite }) => (
        <WatchlistRow
          key={sym.id}
          currentSymbol={currentSymbol}
          favoriteSyncMeta={favoriteSyncMeta}
          feedState={feedState}
          intelligence={intelligence}
          isFavorite={isFavorite}
          lang={lang}
          marketStatus={marketStatus}
          normalizedQuery={normalizedQuery}
          onClose={onClose}
          onSymbolSelect={onSymbolSelect}
          onToggleFavorite={onToggleFavorite}
          setup={setup}
          sym={sym}
          zh={zh}
        />
      ))}
      {matrixRows.length === 0 && (
        <div className="px-4 py-12 text-center text-xs text-slate-600">
          {selectedFilter === "favorites" ? (zh ? "还没有自选，点资产旁边的星标加入。" : "No favorites yet. Use the star next to an asset.") : noAssetsText}
        </div>
      )}
    </div>
  );
}

function WatchlistRow({
  currentSymbol,
  favoriteSyncMeta,
  feedState,
  intelligence,
  isFavorite,
  lang,
  marketStatus,
  normalizedQuery,
  onClose,
  onSymbolSelect,
  onToggleFavorite,
  setup,
  sym,
  zh
}: Omit<WatchlistRowsProps, "matrixRows" | "noAssetsText" | "selectedFilter"> & WatchlistMatrixRow) {
  const isSelected = sym.id === currentSymbol.id;
  const isUp = sym.change24h >= 0;
  const feedTone = feedToneMap[feedState];
  const rowProviderMeta = getRowProviderMeta(sym, isSelected, marketStatus, zh);
  const favoriteLabel = isFavorite ? (zh ? "取消自选" : "Remove favorite") : (zh ? "加入自选" : "Add favorite");
  const marketLabel = getMarketDisplayName(sym.market || sym.type, zh);
  const matchReason = normalizedQuery ? getSymbolMatchReason(sym, normalizedQuery, zh) : "";

  return (
    <button
      onClick={() => {
        onSymbolSelect(sym);
        if (onClose) onClose();
      }}
      className={`group w-full border-b border-slate-900/90 px-2.5 py-2 text-left transition-all duration-150 ${
        isSelected ? "bg-blue-500/20 shadow-[inset_2px_0_0_rgba(54,96,130,0.72)]" : "hover:bg-slate-900/70"
      }`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_58px_48px] items-start gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <FavoriteStar isFavorite={isFavorite} label={favoriteLabel} onToggle={() => onToggleFavorite?.(sym)} />
            <span className="truncate text-[12px] font-black tracking-tight text-white">{sym.id}</span>
            <span title={rowProviderMeta.tooltip} className={`shrink-0 rounded border px-1 py-[1px] font-mono text-[7px] font-black leading-none ${feedTone}`}>
              {feedLabelMap[feedState]}
            </span>
            <span className="shrink-0 rounded border border-slate-800 bg-slate-900/70 px-1 py-[1px] font-mono text-[7px] font-black uppercase leading-none text-slate-500">
              {marketLabel}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[8px] text-slate-500">{sym.name} · {sym.exchange || sym.market || sym.type}</div>
          {(normalizedQuery || isSelected) && (
            <div
              className="mt-0.5 truncate text-[7px] font-bold text-slate-600"
              title={normalizedQuery ? `${matchReason}\n${rowProviderMeta.tooltip}` : rowProviderMeta.tooltip}
            >
              {normalizedQuery ? `${matchReason} · ${rowProviderMeta.label}` : rowProviderMeta.label}
            </div>
          )}
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
            <div className={`h-full rounded-full ${scoreBar(intelligence.score)}`} style={{ width: `${Math.max(8, intelligence.score)}%` }} />
          </div>
        </div>

        <div className="text-right">
          <div className={`text-[11px] font-black ${biasTone(intelligence.bias)}`}>{getBiasLabel(intelligence.bias, lang)}</div>
          <div className="mt-0.5 truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{setup}</div>
        </div>

        <div className="text-right">
          <div className={`font-mono text-[15px] font-black leading-none ${scoreTone(intelligence.score)}`}>{intelligence.score}</div>
          <div className={`mt-1 text-[8px] font-mono font-black ${isUp ? "text-emerald-300" : "text-rose-400"}`}>
            {isUp ? "+" : ""}{sym.change24h.toFixed(1)}%
          </div>
        </div>
      </div>
    </button>
  );
}

function FavoriteStar({ isFavorite, label, onToggle }: { isFavorite: boolean; label: string; onToggle: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={`shrink-0 rounded p-0.5 transition-colors ${isFavorite ? "text-amber-300" : "text-slate-600 hover:text-amber-300"}`}
    >
      <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-amber-300" : "fill-transparent"}`} />
    </span>
  );
}
