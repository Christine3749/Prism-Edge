import { Activity } from "lucide-react";
import type { PrismIntelligence } from "@shared/prismIntelligence";
import type { Language } from "@shared/translations";
import type { MarketSymbol } from "@shared/types";
import { clampPercent, formatDeskPrice } from "./formatters";
import { WarRoomMetricCell } from "./PrimitiveCells";

export function WarRoomOrderGraphPanel({
  intelligence,
  symbol,
  sourceLabel,
  feedState,
  lang
}: {
  intelligence: PrismIntelligence;
  symbol: MarketSymbol;
  sourceLabel: string;
  feedState: string;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const depth = buildDepthValues(intelligence, symbol);
  const spread = Math.max(0.03, Math.min(2.8, intelligence.volatilityPct * 0.18 + Math.abs(symbol.change24h) * 0.05));

  return (
    <section className="border-b border-[#12324a] bg-[#010915]">
      <div className="flex h-8 items-center justify-between border-b border-[#12324a] bg-[#031827] px-3">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-blue-300/70">
          <Activity className="h-3 w-3" />
          {zh ? "订单压力 / 深度图" : "Order Pressure / Depth"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">{sourceLabel} / {feedState}</div>
      </div>
      <div className="border-b border-[#12324a] bg-[#020b18] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 font-mono text-[8px] font-black uppercase tracking-wider">
            <span className="border border-blue-500/30 bg-blue-500/25 px-2 py-1 text-blue-200/75">ORDER GRAPH</span>
            <span className="border border-[#12324a] bg-[#000814] px-2 py-1 text-slate-500">ORDER BOOK</span>
          </div>
          <div className="font-mono text-[7px] font-black uppercase tracking-widest text-slate-500">{symbol.id} / {zh ? "代理深度" : "proxy depth"}</div>
        </div>
      </div>
      <div className="p-3">
        <div className="overflow-hidden border border-[#12324a] bg-[#05080d] shadow-[inset_0_0_0_1px_rgba(54,96,130,0.035),0_18px_36px_rgba(0,0,0,0.22)]">
          <WarRoomStepDepthChart bids={depth.bids} asks={depth.asks} />
        </div>
        <div className="mt-3 grid grid-cols-3 border border-[#12324a]">
          <WarRoomMetricCell label={zh ? "中间价" : "Mid"} value={formatDeskPrice(symbol.price, symbol.precision)} tone="text-blue-300/70" />
          <WarRoomMetricCell label={zh ? "价差" : "Spread"} value={`${spread.toFixed(2)}%`} tone={spread > 1.2 ? "text-amber-300" : "text-emerald-300"} />
          <WarRoomMetricCell label={zh ? "深度" : "Depth"} value={depth.bias} tone={depth.bias === "BID HEAVY" ? "text-blue-300/70" : depth.bias === "ASK HEAVY" ? "text-rose-300" : "text-slate-300"} />
        </div>
      </div>
    </section>
  );
}

function WarRoomStepDepthChart({ bids, asks }: { bids: number[]; asks: number[] }) {
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const bidPower = Math.max(48, Math.min(96, average(bids)));
  const askPower = Math.max(8, Math.min(82, average(asks)));
  const bidLift = (bidPower - 68) * 0.22;
  const askLift = (askPower - 34) * 0.18;
  const baseline = 218;
  const bidLine = buildSmoothDepthPath([
    [58, 70 - bidLift],
    [104, 73 - bidLift],
    [132, 109 - bidLift * 0.45],
    [185, 118 - bidLift * 0.45],
    [216, 151 - bidLift * 0.2],
    [262, 161 - bidLift * 0.2],
    [294, 207 - bidLift * 0.08],
    [330, baseline - 3],
    [368, baseline]
  ]);
  const bidArea = `${bidLine} L 368 ${baseline} L 58 ${baseline} Z`;
  const askLine = buildSmoothDepthPath([
    [368, baseline],
    [452, 216 - askLift * 0.12],
    [512, 204 - askLift * 0.35],
    [584, 181 - askLift * 0.62],
    [620, 136 - askLift]
  ]);
  const askArea = `${askLine} L 620 ${baseline} L 368 ${baseline} Z`;

  return (
    <svg className="war-room-depth-chart h-[220px] w-full" viewBox="0 0 640 260" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="ortexDepthSurface" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--depth-surface-0, #0a1518)" />
          <stop offset="0.48" stopColor="var(--depth-surface-mid, #070708)" />
          <stop offset="1" stopColor="var(--depth-surface-1, #100a0a)" />
        </linearGradient>
        <radialGradient id="ortexDepthMist" cx="50%" cy="44%" r="72%">
          <stop offset="0" stopColor="var(--depth-mist-0, #11343a)" stopOpacity="var(--depth-mist-opacity-0, 0.2)" />
          <stop offset="0.55" stopColor="var(--depth-mist-1, #071013)" stopOpacity="var(--depth-mist-opacity-1, 0.12)" />
          <stop offset="1" stopColor="var(--depth-mist-2, #000000)" stopOpacity="var(--depth-mist-opacity-2, 0)" />
        </radialGradient>
        <linearGradient id="ortexDepthBaseline" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--depth-baseline-bid, #38f5ee)" stopOpacity="var(--depth-baseline-opacity, 0.55)" />
          <stop offset="0.48" stopColor="var(--depth-baseline-mid-bid, #20434a)" stopOpacity="var(--depth-baseline-opacity, 0.55)" />
          <stop offset="0.62" stopColor="var(--depth-baseline-mid-ask, #552020)" stopOpacity="var(--depth-baseline-opacity-soft, 0.45)" />
          <stop offset="1" stopColor="var(--depth-baseline-ask, #ff6658)" stopOpacity="var(--depth-baseline-opacity, 0.55)" />
        </linearGradient>
        <linearGradient id="ortexBidDepthFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--depth-bid-fill-0, #45fff6)" stopOpacity="var(--depth-bid-fill-opacity-0, 0.88)" />
          <stop offset="0.48" stopColor="var(--depth-bid-fill-1, #20bdc0)" stopOpacity="var(--depth-bid-fill-opacity-1, 0.58)" />
          <stop offset="0.78" stopColor="var(--depth-bid-fill-2, #12656d)" stopOpacity="var(--depth-bid-fill-opacity-2, 0.34)" />
          <stop offset="1" stopColor="var(--depth-bid-fill-3, #0a2023)" stopOpacity="var(--depth-bid-fill-opacity-3, 0.2)" />
        </linearGradient>
        <linearGradient id="ortexAskDepthFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--depth-ask-fill-0, #ff796e)" stopOpacity="var(--depth-ask-fill-opacity-0, 0.86)" />
          <stop offset="0.54" stopColor="var(--depth-ask-fill-1, #cf4a43)" stopOpacity="var(--depth-ask-fill-opacity-1, 0.52)" />
          <stop offset="0.82" stopColor="var(--depth-ask-fill-2, #6d2522)" stopOpacity="var(--depth-ask-fill-opacity-2, 0.34)" />
          <stop offset="1" stopColor="var(--depth-ask-fill-3, #271010)" stopOpacity="var(--depth-ask-fill-opacity-3, 0.2)" />
        </linearGradient>
        <filter id="ortexDepthGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ortexDepthSoftEdge" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.15" />
        </filter>
      </defs>
      <rect x="0" y="0" width="640" height="260" fill="url(#ortexDepthSurface)" />
      <rect x="0" y="0" width="640" height="260" fill="url(#ortexDepthMist)" />
      {[52, 92, 132, 172, 212].map((y) => <line key={y} x1="52" x2="622" y1={y} y2={y} stroke="var(--depth-grid-y, #3a302e)" strokeWidth="0.8" strokeOpacity="var(--depth-grid-opacity, 0.42)" />)}
      {[88, 208, 328, 448, 568].map((x) => <line key={x} x1={x} x2={x} y1="36" y2="232" stroke="var(--depth-grid-x, #263942)" strokeWidth="0.8" strokeOpacity="var(--depth-grid-opacity, 0.42)" />)}
      {["12.5", "10.0", "7.5", "5.0", "2.5", "0"].map((label, index) => (
        <text key={label} x="18" y={54 + index * 34} fill="var(--depth-axis-text, #4a3a38)" opacity="var(--depth-axis-opacity, 0.58)" fontSize="10" fontFamily="monospace" fontWeight="700">{label}</text>
      ))}
      <path d={bidArea} className="depth-glow" fill="var(--depth-bid-haze, #37f7ef)" opacity="var(--depth-bid-haze-opacity, 0.22)" filter="url(#ortexDepthGlow)" />
      <path d={askArea} className="depth-glow" fill="var(--depth-ask-haze, #ff675b)" opacity="var(--depth-ask-haze-opacity, 0.2)" filter="url(#ortexDepthGlow)" />
      <path d={bidArea} fill="url(#ortexBidDepthFill)" />
      <path d={askArea} fill="url(#ortexAskDepthFill)" />
      <path d={bidLine} fill="none" className="depth-soft-edge" stroke="var(--depth-bid-soft-edge, #b6fff9)" strokeWidth="5.5" strokeOpacity="var(--depth-soft-edge-opacity, 0.13)" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter="url(#ortexDepthSoftEdge)" />
      <path d={askLine} fill="none" className="depth-soft-edge" stroke="var(--depth-ask-soft-edge, #ffd2cc)" strokeWidth="5.5" strokeOpacity="var(--depth-soft-edge-opacity, 0.12)" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter="url(#ortexDepthSoftEdge)" />
      <path d={bidLine} fill="none" stroke="var(--depth-bid-line, #4cf8ef)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={askLine} fill="none" stroke="var(--depth-ask-line, #ff7468)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <line x1="54" x2="620" y1={baseline} y2={baseline} stroke="url(#ortexDepthBaseline)" strokeWidth="2" />
      <line x1="366" x2="366" y1="42" y2="226" stroke="var(--depth-center-line, #1d5360)" strokeWidth="0.9" strokeDasharray="4 6" strokeOpacity="var(--depth-center-opacity, 0.72)" />
      {["17.1", "17.4", "17.7", "18.0", "18.3"].map((label, index) => (
        <text key={label} x={78 + index * 124} y="246" fill="var(--depth-axis-text, #3c3835)" opacity="var(--depth-axis-opacity-strong, 0.68)" fontSize="10" fontFamily="monospace" fontWeight="700">{label}</text>
      ))}
      <rect x="0" y="0" width="640" height="260" fill="none" stroke="var(--depth-frame, #12324a)" strokeOpacity="var(--depth-frame-opacity, 0.45)" />
    </svg>
  );
}

function buildSmoothDepthPath(points: Array<[number, number]>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  const tension = 0.28;
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const nextAfter = points[Math.min(points.length - 1, index + 2)];
    const cp1x = current[0] + (next[0] - previous[0]) * tension;
    const cp1y = current[1] + (next[1] - previous[1]) * tension;
    const cp2x = next[0] - (nextAfter[0] - current[0]) * tension;
    const cp2y = next[1] - (nextAfter[1] - current[1]) * tension;
    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next[0]} ${next[1]}`;
  }
  return path;
}

function buildDepthValues(intelligence: PrismIntelligence, symbol: MarketSymbol) {
  const momentum = Math.max(-8, Math.min(8, intelligence.momentumPct));
  const volumeBoost = Math.max(0, Math.min(18, (intelligence.volumeRatio - 1) * 12));
  const stress = Math.max(0, Math.min(22, Math.abs(intelligence.drawdownPct) * 1.5));
  const bidBase = 74 + momentum * 2 + volumeBoost - stress * 0.4;
  const askBase = 28 - momentum * 1.4 + stress + (symbol.change24h < 0 ? 12 : 0);
  const bids = [bidBase + 18, bidBase + 8, bidBase - 5, bidBase - 28, bidBase - 58].map(clampPercent);
  const asks = [askBase - 22, askBase - 12, askBase, askBase + 16, askBase + 34, askBase + 48].map(clampPercent);
  const bidSum = bids.reduce((sum, value) => sum + value, 0);
  const askSum = asks.reduce((sum, value) => sum + value, 0);
  const bias = bidSum > askSum * 1.18 ? "BID HEAVY" : askSum > bidSum * 1.18 ? "ASK HEAVY" : "BALANCED";
  return { bids, asks, bias };
}
