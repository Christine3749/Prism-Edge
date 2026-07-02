import type { MarketDataStatus, MarketSymbol } from "@shared/types";

export function canUseSimulatedRuntime(symbol?: MarketSymbol) {
  return symbol?.dataProvider === "simulated" || symbol?.market === "internal";
}

export function shouldRunLocalMarketPulse(status: MarketDataStatus | undefined, symbol?: MarketSymbol) {
  if (!status || !canUseSimulatedRuntime(symbol)) return false;
  const source = (status.source || "").toLowerCase();
  return status.state === "simulated" || source.includes("simulated") || source.includes("local-sim");
}

export function pulseMarketSymbol(symbol: MarketSymbol, index: number, now: number, activeId: string): MarketSymbol {
  if (!Number.isFinite(symbol.price) || symbol.price <= 0) return symbol;

  const seed = stableSymbolSeed(symbol.symbol || symbol.id) + index * 17;
  const wave = Math.sin(now / 1450 + seed * 0.73);
  const micro = Math.sin(now / 670 + seed * 1.31);
  const jitter = Math.random() - 0.5;
  const baseAmplitude = symbol.type === "forex" ? 0.00028 : symbol.type === "crypto" ? 0.0019 : 0.0011;
  const focusBoost = symbol.id === activeId ? 1.35 : 1;
  const percentMove = (wave * 0.38 + micro * 0.22 + jitter * 0.42) * baseAmplitude * focusBoost;
  const minPrice = Math.pow(10, -Math.max(symbol.precision, 2));
  const nextPrice = Math.max(minPrice, symbol.price * (1 + percentMove));
  const nextChange = clampNumber(symbol.change24h + percentMove * 420, -18, 18);
  const volumePulse = 1 + Math.abs(percentMove) * 40 + Math.max(-0.006, Math.min(0.009, jitter * 0.01));

  return {
    ...symbol,
    price: Number(nextPrice.toFixed(symbol.precision)),
    change24h: Number(nextChange.toFixed(2)),
    volume24h: Math.max(0, Math.round(symbol.volume24h * volumePulse)),
    lastSource: "local-sim",
    lastDataState: "simulated",
    lastUpdatedAt: now
  };
}

export function stableSymbolSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % 997;
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
