import { buildPrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import type { PrismBias } from "@shared/prismIntelligence";
import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";

export type MatrixPool = "all" | "crypto" | "us" | "hk" | "cn" | "forex";
export type SortKey = "score" | "change" | "pressure" | "dgwm";

export interface MatrixPrefs {
  pool: MatrixPool;
  sortKey: SortKey;
  query: string;
}

export interface MatrixRowModel {
  symbol: MarketSymbol;
  score: number;
  bias: PrismBias;
  feedState: MarketDataStatus["state"];
  pressure: number;
  dgwm: number;
  flow: number;
  brief: ReturnType<typeof describePrismIntelligence>;
}

export function buildMatrixRows(symbols: MarketSymbol[], current: MarketSymbol, marketStatus: MarketDataStatus | undefined, lang: Language): MatrixRowModel[] {
  const merged = new Map<string, MarketSymbol>();
  [current, ...symbols].forEach((symbol) => merged.set(symbol.symbol || symbol.id, symbol));
  return Array.from(merged.values()).map((symbol) => {
    const selected = symbol.id === current.id;
    const intelligence = buildPrismIntelligence(symbol, [], selected ? marketStatus : undefined);
    const pressure = clamp(42 + Math.abs(intelligence.drawdownPct) * 2.8 + intelligence.volatilityPct * 4 + (100 - intelligence.score) * 0.18, 8, 96);
    const dgwm = clamp(Math.round(intelligence.confidencePct * 0.72 + intelligence.score * 0.28), 1, 99);
    const flow = clamp(50 + (intelligence.volumeRatio - 1) * 18 + symbol.change24h * 1.6, 1, 99);
    return {
      symbol,
      score: intelligence.score,
      bias: intelligence.bias,
      feedState: selected ? (marketStatus?.state || symbol.lastDataState || "simulated") : (symbol.lastDataState || "delayed"),
      pressure: Math.round(pressure),
      dgwm,
      flow: Math.round(flow),
      brief: describePrismIntelligence(intelligence, symbol, lang)
    };
  });
}

export function poolMatches(symbol: MarketSymbol, pool: MatrixPool) {
  if (pool === "all") return true;
  return (symbol.market || symbol.type) === pool;
}

export function valueForSort(row: MatrixRowModel, sortKey: SortKey) {
  if (sortKey === "change") return row.symbol.change24h;
  if (sortKey === "pressure") return row.pressure;
  if (sortKey === "dgwm") return row.dgwm;
  return row.score;
}

export function buildTooltip(row: MatrixRowModel, zh: boolean) {
  return zh
    ? `Score ${row.score}\n趋势/动量: ${row.symbol.change24h.toFixed(1)}%\n压力: ${row.pressure}\n流向: ${row.flow}\nDGWM: ${row.dgwm}`
    : `Score ${row.score}\nTrend/Momentum: ${row.symbol.change24h.toFixed(1)}%\nPressure: ${row.pressure}\nFlow: ${row.flow}\nDGWM: ${row.dgwm}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}