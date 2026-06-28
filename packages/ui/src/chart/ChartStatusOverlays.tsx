import type { Candle, MarketDataStatus, MarketSymbol } from "../../../shared/src/types";
import { formatCompactVolume, formatPanelPrice } from "./chartFormatters";

interface ChartStatusOverlaysProps {
  candles: Candle[];
  currentSymbol: MarketSymbol;
  currentTimeframe: string;
  marketStatus?: MarketDataStatus;
  dimPrimaryInfo?: boolean;
}

export function ChartStatusOverlays({
  candles,
  currentSymbol,
  currentTimeframe,
  marketStatus,
  dimPrimaryInfo = false
}: ChartStatusOverlaysProps) {
  const latestCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];
  const candleChange = latestCandle && previousCandle ? latestCandle.close - previousCandle.close : 0;
  const candleChangePercent = latestCandle && previousCandle && previousCandle.close !== 0
    ? (candleChange / previousCandle.close) * 100
    : 0;
  const ohlcTone = candleChange >= 0 ? "text-teal-400" : "text-rose-400";
  const dataState = marketStatus?.state || (candles.length > 0 ? "live" : "loading");
  const primaryInfoTone = dimPrimaryInfo
    ? "border-cyan-400/10 bg-slate-950/25 text-slate-600 opacity-50 shadow-none"
    : "border-slate-800/70 bg-slate-950/70 text-slate-400 opacity-100 shadow-lg hover:border-cyan-400/10 hover:bg-slate-950/25 hover:text-slate-600 hover:opacity-50 hover:shadow-none";
  const primarySymbolTone = dimPrimaryInfo ? "text-slate-500" : "text-slate-100 group-hover:text-slate-500";
  const primaryValueTone = dimPrimaryInfo ? "text-slate-500" : "text-slate-200 group-hover:text-slate-500";
  const primaryMoveTone = dimPrimaryInfo ? "text-slate-500" : `${ohlcTone} group-hover:text-slate-500`;

  return (
    <>
      {latestCandle && (
        <div className={`group pointer-events-auto absolute left-3 top-3 z-20 hidden max-w-[calc(100%-7rem)] cursor-default items-center gap-2 overflow-hidden rounded border px-2 py-1 font-mono text-[10px] backdrop-blur-sm transition-[opacity,background-color,border-color,color,box-shadow] duration-150 md:flex ${primaryInfoTone}`}>
          <span className={`font-bold transition-colors duration-150 ${primarySymbolTone}`}>{currentSymbol.id}</span>
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
      )}

      {dataState === "loading" && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-20 mx-auto flex w-fit items-center gap-2 rounded border border-sky-500/20 bg-slate-950/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-300 shadow-lg backdrop-blur-sm">
          <span className="h-3 w-3 rounded-full border-2 border-sky-300 border-t-transparent animate-spin"></span>
          Loading market candles
        </div>
      )}

      {(dataState === "stale" || dataState === "delayed") && (
        <div className={`pointer-events-none absolute inset-x-0 top-16 z-20 mx-auto flex w-fit items-center gap-2 rounded border bg-slate-950/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-lg backdrop-blur-sm ${
          dataState === "stale"
            ? "border-orange-500/20 text-orange-300"
            : "border-blue-500/20 text-blue-300"
        }`}>
          {dataState === "stale" ? "Data delayed" : "Delayed market feed"} · {marketStatus?.source || "gateway"}
          {marketStatus?.latencyMs ? ` · ${marketStatus.latencyMs}ms` : ""}
        </div>
      )}
    </>
  );
}
