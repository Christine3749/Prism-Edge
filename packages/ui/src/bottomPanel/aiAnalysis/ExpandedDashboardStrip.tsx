import { Activity, Play } from "lucide-react";
import type { MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import type { PrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import { biasTone, clampDashboard, formatSignedOneDecimal } from "./helpers";
import { WarBottomAnalystTile, WarBottomScoreTile, WarBottomTile } from "./WarBottomTiles";
import { WarBottomBars, WarBottomDividendState, WarBottomDualMeter, WarBottomInsiderSignal, WarBottomLevelTrack, WarBottomRangeTrack, WarBottomSmallText, WarBottomStars } from "./WarBottomVisuals";

export function ExpandedDashboardStrip({
  currentSymbol,
  intelligence,
  brief,
  marketState,
  sourceLabel,
  analysisLinked,
  candleCount,
  newsCount,
  buttonLabel,
  loading,
  lang,
  onRunAnalysis
}: {
  currentSymbol: MarketSymbol;
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  marketState: string;
  sourceLabel: string;
  analysisLinked: boolean;
  candleCount: number;
  newsCount: number;
  buttonLabel: string;
  loading: boolean;
  lang: Language;
  onRunAnalysis: () => void;
}) {
  const zh = lang === "zh" || lang === "tc";
  const trendPower = clampDashboard(50 + intelligence.momentumPct * 5 + (intelligence.score - 50) * 0.45);
  const momentumPower = clampDashboard(50 + intelligence.momentumPct * 8);
  const volPressure = clampDashboard(intelligence.volatilityPct * 15);
  const drawdownPressure = clampDashboard(Math.abs(intelligence.drawdownPct) * 5.8);
  const volumeHeat = clampDashboard(intelligence.volumeRatio * 46);
  const evidenceLoad = clampDashboard(candleCount * 0.35 + newsCount * 8 + intelligence.confidencePct * 0.25);
  const modelReadiness = analysisLinked ? 92 : 54;
  const pressureIndex = clampDashboard((volPressure + drawdownPressure) / 2);
  const catalystIndex = clampDashboard(newsCount * 16 + Math.abs(intelligence.momentumPct) * 4 + 24);
  const c2dIndex = clampDashboard(intelligence.confidencePct * 0.68 + modelReadiness * 0.32);
  const modeLabel = analysisLinked ? "DGWM LINK" : "FRONTEND";
  const signalLabel = String(brief.bias).toUpperCase();
  const growthLabel = currentSymbol.type === "crypto" ? "FLOW MOM" : "EPS";
  const carryLabel = currentSymbol.type === "crypto" ? "PERP CARRY" : "DIVIDEND";
  const carryValue = currentSymbol.type === "crypto" ? (intelligence.momentumPct >= 0 ? "POSITIVE" : "NEGATIVE") : "NO FORECAST";
  const feeReadout = currentSymbol.type === "crypto" ? `${formatSignedOneDecimal(intelligence.momentumPct * 0.18)}` : `${Math.max(0.3, pressureIndex / 4.8).toFixed(2)}%`;
  const insiderMeter = clampDashboard(44 + intelligence.momentumPct * 4 + newsCount * 3);
  const analystChange = clampDashboard(42 + (intelligence.score - 50) * 0.85 + (analysisLinked ? 12 : 0));
  const valuationIndustry = clampDashboard(58 - intelligence.drawdownPct * 0.8 + intelligence.momentumPct * 2);
  const valuationHistory = clampDashboard(42 + intelligence.score * 0.42 - volPressure * 0.22);
  const optionSkew = clampDashboard(38 + volPressure * 0.42 + Math.abs(intelligence.momentumPct) * 4);
  const ctbPressure = clampDashboard(pressureIndex + (brief.risk === "stress" ? 18 : brief.risk === "elevated" ? 8 : 0));

  return (
    <div className="war-bottom-ribbon flex h-full min-h-[148px] flex-col overflow-hidden border-t border-[#12324a] bg-[#000814]">
      <div className="war-bottom-strip-header flex h-7 shrink-0 items-center justify-between border-b border-[#12324a] bg-[#020b18] px-3 font-mono text-[8px] font-black uppercase tracking-[0.22em]">
        <div className="flex min-w-0 items-center gap-2 text-blue-200/75">
          <Activity className="h-3 w-3" />
          <span className="truncate">{zh ? "单票指标仪表带" : "Single Asset Factor Ribbon"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-slate-500">
          <span>{currentSymbol.id}</span>
          <span>/</span>
          <span>{sourceLabel}</span>
          <span>/</span>
          <span>{marketState}</span>
        </div>
      </div>

      <div className="war-bottom-rail flex min-h-0 flex-1 overflow-x-auto bg-[#000814] no-scrollbar">
        <WarBottomTile label="PERF" value={formatSignedOneDecimal(currentSymbol.change24h)} sub={zh ? "价格表现" : "price move"} tone={currentSymbol.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}>
          <WarBottomLevelTrack value={trendPower} tone={currentSymbol.change24h >= 0 ? "emerald" : "rose"} />
        </WarBottomTile>

        <WarBottomTile label="FEES" value={feeReadout} sub={zh ? "借券/资金费" : "borrow/funding"} tone={pressureIndex > 62 ? "text-amber-300" : "text-blue-300/70"}>
          <WarBottomRangeTrack value={pressureIndex} tone={pressureIndex > 62 ? "amber" : "cyan"} marker={volPressure} />
        </WarBottomTile>

        <WarBottomTile label="INSIDERS" value={insiderMeter >= 55 ? (zh ? "净买入" : "NET BUY") : (zh ? "观察" : "WATCH")} sub={zh ? "大户/内部人代理" : "whale proxy"} tone={insiderMeter >= 55 ? "text-emerald-300" : "text-slate-300"}>
          <WarBottomInsiderSignal value={insiderMeter} />
        </WarBottomTile>

        <WarBottomAnalystTile value={analystChange} />

        <WarBottomTile label="EVENTS" value={`${newsCount}`} sub={zh ? "事件密度" : "upcoming events"} tone="text-amber-300">
          <WarBottomBars values={[18, 24, catalystIndex, 42, 34, 56]} tone="amber" />
          <WarBottomSmallText left={zh ? "开放" : "open"} right={`${candleCount}K`} />
        </WarBottomTile>

        <WarBottomScoreTile label="STOCK SCORE" value={intelligence.score} sub="MSIR" />

        <WarBottomTile label={growthLabel} value={formatSignedOneDecimal(intelligence.momentumPct * 0.62)} sub={currentSymbol.type === "crypto" ? "flow proxy" : "earnings proxy"} tone={intelligence.momentumPct >= 0 ? "text-emerald-300" : "text-rose-300"}>
          <WarBottomLevelTrack value={momentumPower} tone={intelligence.momentumPct >= 0 ? "emerald" : "rose"} />
        </WarBottomTile>

        <WarBottomTile label="TRADER SIGNALS" value={signalLabel} sub={brief.setup} tone={biasTone(intelligence.bias)} wide>
          <WarBottomStars value={trendPower} />
          <WarBottomSmallText left={brief.risk} right={formatSignedOneDecimal(intelligence.drawdownPct)} />
        </WarBottomTile>

        <WarBottomTile label={carryLabel} value={carryValue} sub={zh ? "收益/持仓成本" : "carry profile"} tone={currentSymbol.type === "crypto" ? (intelligence.momentumPct >= 0 ? "text-emerald-300" : "text-rose-300") : "text-slate-300"} wide>
          <WarBottomDividendState active={currentSymbol.type === "crypto"} value={clampDashboard(48 + intelligence.momentumPct * 5)} />
        </WarBottomTile>

        <WarBottomTile label="VOLUME" value={`${intelligence.volumeRatio.toFixed(1)}x`} sub={sourceLabel} tone={intelligence.volumeRatio >= 1.25 ? "text-emerald-300" : "text-slate-300"}>
          <WarBottomBars values={[24, 38, volumeHeat, 48, 42, 35]} tone="cyan" />
        </WarBottomTile>

        <WarBottomTile label="VALUATION" value={`${Math.round(valuationIndustry)}`} sub={zh ? "相对位置" : "vs industry"} tone="text-slate-100" wide>
          <WarBottomDualMeter top={valuationIndustry} bottom={valuationHistory} />
        </WarBottomTile>

        <WarBottomTile label="OPTIONS" value={currentSymbol.type === "crypto" ? "PERP" : "WATCH"} sub={zh ? "波动/偏斜" : "vol/skew"} tone={optionSkew > 62 ? "text-amber-300" : "text-blue-300/70"}>
          <WarBottomRangeTrack value={optionSkew} tone={optionSkew > 62 ? "amber" : "cyan"} marker={volPressure} />
        </WarBottomTile>

        <WarBottomTile label="CTB" value={`${(ctbPressure / 18).toFixed(2)}%`} sub={zh ? "空头压力" : "short pressure"} tone={ctbPressure > 62 ? "text-rose-300" : "text-blue-300/70"}>
          <WarBottomRangeTrack value={ctbPressure} tone={ctbPressure > 62 ? "rose" : "cyan"} marker={pressureIndex} />
        </WarBottomTile>

        <div className="war-bottom-action-tile relative flex min-w-[204px] flex-col justify-between border-l border-amber-300/35 bg-[#06111d] p-2.5 shadow-[inset_3px_0_0_rgba(251,191,36,0.7)]">
          <div className="min-w-0">
            <div className="font-mono text-[7px] font-black uppercase tracking-[0.24em] text-amber-300">{zh ? "下一步动作" : "Next Action"}</div>
            <div className="mt-2 truncate text-[13px] font-black text-slate-100">{zh ? "进入 DGWM 复核" : "Send To DGWM Review"}</div>
            <div className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-slate-500">{brief.action}</div>
          </div>
          <button
            onClick={onRunAnalysis}
            disabled={loading}
            className="mt-2 flex h-8 w-full items-center justify-center gap-2 border border-blue-500/30 bg-blue-500/25 px-3 text-[10px] font-black uppercase tracking-wider text-blue-100/80 shadow-[inset_0_0_0_1px_rgba(54,96,130,0.08)] transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-blue-100/80 stroke-none" />
            <span className="truncate">{buttonLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}