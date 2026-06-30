import { useState } from "react";
import type { Candle, MarketDataStatus, MarketSymbol } from "../../../shared/src/types";
import { describeMarketStatus } from "../../../shared/src/marketStatus";
import { formatCompactVolume, formatPanelPrice } from "./chartFormatters";

interface ChartStatusOverlaysProps {
  candles: Candle[];
  currentSymbol: MarketSymbol;
  currentTimeframe: string;
  marketStatus?: MarketDataStatus;
  dimPrimaryInfo?: boolean;
  onPrimaryInfoHoverChange?: (active: boolean) => void;
}

export function ChartStatusOverlays({
  candles,
  currentSymbol,
  currentTimeframe,
  marketStatus,
  dimPrimaryInfo = false,
  onPrimaryInfoHoverChange
}: ChartStatusOverlaysProps) {
  const [primaryInfoHovered, setPrimaryInfoHovered] = useState(false);
  const setPrimaryInfoHover = (active: boolean) => {
    setPrimaryInfoHovered(active);
    onPrimaryInfoHoverChange?.(active);
  };
  const latestCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];
  const candleChange = latestCandle && previousCandle ? latestCandle.close - previousCandle.close : 0;
  const candleChangePercent = latestCandle && previousCandle && previousCandle.close !== 0
    ? (candleChange / previousCandle.close) * 100
    : 0;
  const ohlcTone = candleChange >= 0 ? "text-emerald-300" : "text-rose-400";
  const dataState = marketStatus?.state || (candles.length > 0 ? "live" : "loading");
  const statusMeta = describeMarketStatus(marketStatus || {
    state: dataState,
    source: "gateway",
    provider: currentSymbol.exchange || currentSymbol.market,
    updatedAt: currentSymbol.lastUpdatedAt
  });
  const statusBannerTone = {
    delayed: "border-blue-500/20 text-blue-300/75",
    stale: "border-orange-500/20 text-orange-300",
    simulated: "border-amber-500/20 text-amber-300",
    error: "border-rose-500/20 text-rose-300",
    loading: "border-blue-500/30 text-blue-300/70",
    live: "border-emerald-500/25 text-emerald-300"
  }[dataState];
  const primarySymbolDimmed = dimPrimaryInfo || primaryInfoHovered;
  const primaryInfoTone = "border-[#12324a]/70 bg-[#000814]/78 text-slate-400 opacity-100 shadow-lg";
  const primarySymbolTone = primarySymbolDimmed ? "text-slate-500 opacity-60" : "text-slate-100 opacity-100";
  const primaryValueTone = "text-slate-200";
  const primaryMoveTone = ohlcTone;

  return (
    <>
      {latestCandle && (
        <div className="pointer-events-none absolute left-0 top-0 z-20 hidden h-16 w-[min(920px,calc(100%-7rem))] md:block">
          <div
            className={`pointer-events-auto absolute left-3 top-3 flex max-w-full cursor-default items-center gap-2 overflow-hidden rounded border px-2 py-1 font-mono text-[10px] backdrop-blur-sm transition-[opacity,background-color,border-color,color,box-shadow] duration-150 ${primaryInfoTone}`}
            onPointerEnter={() => setPrimaryInfoHover(true)}
            onPointerLeave={() => setPrimaryInfoHover(false)}
          >
            <span className={`font-bold transition-[color,opacity] duration-150 ${primarySymbolTone}`}>{currentSymbol.id}</span>
            <span className="text-slate-600">•</span>
            <span>{currentTimeframe}</span>
            <span>O <b className={`font-semibold transition-colors duration-150 ${primaryValueTone}`}>{formatPanelPrice(latestCandle.open, currentSymbol.precision)}</b></span>
            <span>H <b className={`font-semibold transition-colors duration-150 ${primaryValueTone}`}>{formatPanelPrice(latestCandle.high, currentSymbol.precision)}</b></span>
            <span>L <b className={`font-semibold transition-colors duration-150 ${primaryValueTone}`}>{formatPanelPrice(latestCandle.low, currentSymbol.precision)}</b></span>
            <span>C <b className={`font-semibold transition-colors duration-150 ${primaryValueTone}`}>{formatPanelPrice(latestCandle.close, currentSymbol.precision)}</b></span>
            <span className={`transition-colors duration-150 ${primaryMoveTone}`}>
              {candleChange >= 0 ? "+" : ""}{formatPanelPrice(candleChange, currentSymbol.precision)}
              {" "}({candleChange >= 0 ? "+" : ""}{candleChangePercent.toFixed(2)}%)
            </span>
            <span>Vol <b className={`font-semibold transition-colors duration-150 ${primaryValueTone}`}>{formatCompactVolume(latestCandle.volume)}</b></span>
          </div>
        </div>
      )}

      {dataState === "loading" && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-20 mx-auto flex w-fit items-center gap-2 rounded border border-blue-500/30 bg-[#000814]/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-300/70 shadow-lg backdrop-blur-sm">
          <span className="h-3 w-3 rounded-full border-2 border-blue-500/25 border-t-transparent animate-spin"></span>
          Loading market candles
        </div>
      )}

      {(dataState === "stale" || dataState === "delayed" || dataState === "simulated" || dataState === "error") && (
        <div className={`pointer-events-none absolute inset-x-0 top-16 z-20 mx-auto flex max-w-[min(560px,calc(100%-2rem))] items-center gap-2 rounded border bg-[#000814]/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-lg backdrop-blur-sm ${statusBannerTone}`} title={statusMeta.tooltip}>
          <span className="shrink-0">{statusMeta.label}</span>
          <span className="text-slate-600">·</span>
          <span className="shrink-0">{statusMeta.sourceLine}</span>
          <span className="hidden max-w-[240px] truncate text-slate-500 lg:inline">{statusMeta.reason}</span>
        </div>
      )}
    </>
  );
}
