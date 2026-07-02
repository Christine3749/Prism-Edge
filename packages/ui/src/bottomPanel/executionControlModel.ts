import { buildPrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import type { PrismBias } from "@shared/prismIntelligence";
import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";

export type ExecutionVerdict = "pass" | "review" | "blocked";
export type ExecutionDirection = "long" | "short" | "hold";
export type ExecutionSource = "dgwm" | "manual";

export interface ExecutionPosition {
  symbol: MarketSymbol;
  direction: ExecutionDirection;
  score: number;
  targetPct: number;
  riskPct: number;
  unrealizedPct: number;
}

export interface ExecutionControlPlan {
  source: ExecutionSource;
  direction: ExecutionDirection;
  score: number;
  dgwm: number;
  verdict: ExecutionVerdict;
  reason: string;
  expectedRoiPct: number;
  roiThresholdPct: number;
  netEdgePct: number;
  entryCostBps: number;
  exitCostBps: number;
  totalCostBps: number;
  maxPositionPct: number;
  stopDistancePct: number;
  route: "paper" | "blocked";
  exposure: {
    grossPct: number;
    netPct: number;
    heatPct: number;
    cashPct: number;
  };
  positions: ExecutionPosition[];
  audit: Array<{ label: string; ok: boolean; value: string }>;
}

export function buildExecutionControlPlan(
  currentSymbol: MarketSymbol,
  symbolsList: MarketSymbol[],
  marketStatus: MarketDataStatus | undefined,
  lang: Language,
  requestedSource?: ExecutionSource
): ExecutionControlPlan {
  const zh = lang === "zh" || lang === "tc";
  const currentIntel = buildPrismIntelligence(currentSymbol, [], marketStatus);
  const currentBrief = describePrismIntelligence(currentIntel, currentSymbol, lang);
  const source: ExecutionSource = requestedSource ?? (currentIntel.confidencePct >= 78 && currentIntel.score >= 62 ? "dgwm" : "manual");
  const direction = directionFromBias(currentIntel.bias);
  const feedRisk = marketStatus?.state === "error" || marketStatus?.state === "stale" || currentIntel.risk === "feed";
  const feeBps = currentSymbol.type === "crypto" ? 8 : currentSymbol.type === "forex" ? 4 : 12;
  const spreadBps = currentSymbol.type === "crypto" ? 5 : currentSymbol.market === "hk" || currentSymbol.market === "cn" ? 18 : 10;
  const volatilityBps = clamp(currentIntel.volatilityPct * 9, 4, 80);
  const stressBps = currentIntel.risk === "stress" ? 38 : currentIntel.risk === "elevated" ? 18 : 8;
  const entryCostBps = Math.round(feeBps + spreadBps + volatilityBps * 0.45);
  const exitCostBps = Math.round(feeBps + spreadBps * 1.15 + volatilityBps * 0.75 + stressBps);
  const totalCostBps = entryCostBps + exitCostBps;
  const riskBufferPct = currentIntel.risk === "stress" ? 1.8 : currentIntel.risk === "elevated" ? 1.1 : 0.65;
  const roiThresholdPct = round1(totalCostBps / 100 + riskBufferPct);
  const expectedRoiPct = round1(clamp(
    Math.abs(currentIntel.momentumPct) * 0.52 +
    Math.max(0, currentIntel.score - 50) * 0.06 +
    Math.max(0, currentIntel.volumeRatio - 0.75) * 0.8 -
    currentIntel.volatilityPct * 0.16,
    -1.5,
    12
  ));
  const netEdgePct = round1(expectedRoiPct - roiThresholdPct);
  const dgwm = Math.round(currentIntel.confidencePct * 0.62 + currentIntel.score * 0.38);
  const verdict: ExecutionVerdict = feedRisk || direction === "hold" || netEdgePct < -0.2
    ? "blocked"
    : dgwm >= 72 && netEdgePct >= 0.6
      ? "pass"
      : "review";
  const positions = buildPositions(currentSymbol, symbolsList, marketStatus);
  const grossPct = round1(positions.reduce((sum, item) => sum + Math.abs(item.targetPct), 0));
  const netPct = round1(positions.reduce((sum, item) => sum + signedExposure(item), 0));
  const heatPct = round1(clamp(grossPct * 0.74 + positions.reduce((sum, item) => sum + item.riskPct, 0) * 0.22, 0, 100));
  const maxPositionPct = verdict === "blocked" ? 0 : round1(clamp(netEdgePct * 3.4 + dgwm * 0.11 - heatPct * 0.05, 1, 16));
  const stopDistancePct = round1(clamp(currentIntel.volatilityPct * 1.4 + Math.abs(currentIntel.drawdownPct) * 0.12 + 1.1, 1.2, 14));

  return {
    source,
    direction,
    score: currentIntel.score,
    dgwm,
    verdict,
    reason: reasonFor(verdict, currentBrief.action, zh),
    expectedRoiPct,
    roiThresholdPct,
    netEdgePct,
    entryCostBps,
    exitCostBps,
    totalCostBps,
    maxPositionPct,
    stopDistancePct,
    route: verdict === "blocked" ? "blocked" : "paper",
    exposure: {
      grossPct,
      netPct,
      heatPct,
      cashPct: round1(clamp(100 - grossPct, 0, 100))
    },
    positions,
    audit: [
      { label: zh ? "数据可信" : "Feed trusted", ok: !feedRisk, value: `${currentIntel.confidencePct}%` },
      { label: zh ? "退出成本已计入" : "Exit cost priced", ok: exitCostBps > entryCostBps, value: `${exitCostBps} bps` },
      { label: zh ? "ROI 覆盖门槛" : "ROI clears hurdle", ok: netEdgePct >= 0, value: `${netEdgePct >= 0 ? "+" : ""}${netEdgePct}%` },
      { label: zh ? "仓位受限" : "Position capped", ok: maxPositionPct <= 16, value: `${maxPositionPct}%` }
    ]
  };
}

function buildPositions(currentSymbol: MarketSymbol, symbolsList: MarketSymbol[], marketStatus?: MarketDataStatus): ExecutionPosition[] {
  const merged = new Map<string, MarketSymbol>();
  [currentSymbol, ...symbolsList].forEach((symbol) => merged.set(symbol.symbol || symbol.id, symbol));
  return Array.from(merged.values())
    .map((symbol) => {
      const intel = buildPrismIntelligence(symbol, [], symbol.id === currentSymbol.id ? marketStatus : undefined);
      const direction = directionFromBias(intel.bias);
      const riskPct = Math.round(clamp(intel.volatilityPct * 8 + Math.abs(intel.drawdownPct) * 1.4 + (100 - intel.confidencePct) * 0.18, 4, 88));
      const targetPct = direction === "hold" ? 0 : round1(clamp((intel.score - 45) * 0.28 + intel.confidencePct * 0.035 - riskPct * 0.025, 0, 12));
      return { symbol, direction, score: intel.score, targetPct, riskPct, unrealizedPct: round1(symbol.change24h * 0.42) };
    })
    .sort((a, b) => b.targetPct + b.score * 0.05 - (a.targetPct + a.score * 0.05))
    .slice(0, 8);
}

function directionFromBias(bias: PrismBias): ExecutionDirection {
  if (bias === "long") return "long";
  if (bias === "short") return "short";
  return "hold";
}

function signedExposure(position: ExecutionPosition) {
  if (position.direction === "short") return -position.targetPct;
  if (position.direction === "long") return position.targetPct;
  return 0;
}

function reasonFor(verdict: ExecutionVerdict, action: string, zh: boolean) {
  if (verdict === "pass") return zh ? "ROI 已覆盖进出场成本，可进入纸面执行队列。" : "ROI clears entry and exit costs; eligible for paper execution.";
  if (verdict === "review") return zh ? "边际优势不足，保留人工复核。" : "Edge is narrow; keep it in manual review.";
  return zh ? `拦截：${action}` : `Blocked: ${action}`;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

