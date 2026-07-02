import { Play } from "lucide-react";
import type { Language } from "@shared/translations";
import type { PrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import { ActionStep, DecisionMetric } from "./SmallCells";
import { biasTone, clampDashboard, formatSignedOneDecimal, riskTone } from "./helpers";

export function TrendDashboard({
  intelligence,
  brief,
  marketState,
  sourceLabel,
  analysisLinked,
  lang
}: {
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  marketState: string;
  sourceLabel: string;
  analysisLinked: boolean;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const trendPower = clampDashboard(50 + intelligence.momentumPct * 5 + (intelligence.score - 50) * 0.45);
  const momentumPower = clampDashboard(50 + intelligence.momentumPct * 8);
  const volPressure = clampDashboard(intelligence.volatilityPct * 15);
  const drawdownPressure = clampDashboard(Math.abs(intelligence.drawdownPct) * 5.8);
  const volumeHeat = clampDashboard(intelligence.volumeRatio * 46);
  const modelReadiness = analysisLinked ? 92 : 54;

  return (
    <div className="mt-3 min-h-0 flex-1">
      <div className="grid grid-cols-2 gap-2">
        <DashboardGauge label={zh ? "趋势强度" : "Trend"} value={trendPower} readout={brief.bias} tone={biasTone(intelligence.bias)} />
        <DashboardGauge label={zh ? "20K 动量" : "Momentum"} value={momentumPower} readout={`${intelligence.momentumPct >= 0 ? "+" : ""}${intelligence.momentumPct.toFixed(1)}%`} tone={biasTone(intelligence.bias)} />
        <DashboardGauge label={zh ? "波动压力" : "Volatility"} value={volPressure} readout={`${intelligence.volatilityPct.toFixed(1)}%`} tone={intelligence.volatilityPct > 4 ? "text-amber-300" : "text-blue-300/70"} />
        <DashboardGauge label={zh ? "回撤压力" : "Drawdown"} value={drawdownPressure} readout={`${intelligence.drawdownPct.toFixed(1)}%`} tone={riskTone(intelligence.risk)} />
        <DashboardGauge label={zh ? "量能热度" : "Volume Heat"} value={volumeHeat} readout={`${intelligence.volumeRatio.toFixed(1)}x`} tone={intelligence.volumeRatio >= 1.25 ? "text-emerald-300" : "text-slate-300"} />
        <DashboardGauge label={zh ? "模型准备" : "Model Ready"} value={modelReadiness} readout={analysisLinked ? "LINK" : "WAIT"} tone={analysisLinked ? "text-emerald-300" : "text-blue-300/70"} />
      </div>
      <div className="mt-2 rounded border border-blue-500/30 bg-[#031426]/58 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-widest">
          <span className="text-slate-500">{zh ? "行情源" : "Feed"}</span>
          <span className="font-mono text-blue-300/70">{sourceLabel} · {marketState}</span>
        </div>
        <div className="mt-1 text-[9px] leading-relaxed text-slate-500">
          {zh ? "趋势参数只回答一个问题：这只标的现在是否值得推进到 DGWM。" : "These parameters answer one question: should this symbol advance to DGWM?"}
        </div>
      </div>
    </div>
  );
}

export function InferenceChainPanel({
  intelligence,
  brief,
  marketState,
  sourceLabel,
  newsCount,
  newsLoading,
  lang
}: {
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  marketState: string;
  sourceLabel: string;
  newsCount: number;
  newsLoading: boolean;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const catalystMeta = newsLoading
    ? (zh ? "同步重大行为" : "Syncing catalysts")
    : newsCount > 0
      ? `${newsCount} ${zh ? "条行为证据" : "behavior signals"}`
      : (zh ? "上方情报台参与判断" : "Intel desk feeds the thesis");

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between gap-2">
      <div className="space-y-1.5">
        <ActionStep index="01" title={zh ? "确认趋势结构" : "Confirm Trend Structure"} meta={`${brief.setup} / ${brief.bias}`} />
        <ActionStep index="02" title={zh ? "读取趋势参数" : "Read Trend Parameters"} meta={`20K ${formatSignedOneDecimal(intelligence.momentumPct)} · DD ${intelligence.drawdownPct.toFixed(1)}%`} />
        <ActionStep index="03" title={zh ? "吸收重大行为" : "Absorb Major Behavior"} meta={catalystMeta} />
        <ActionStep index="04" title={zh ? "形成 DGWM 假设" : "Form DGWM Thesis"} meta={`${brief.risk} · ${sourceLabel} / ${marketState}`} />
      </div>
      <div className="rounded border border-blue-500/30 bg-blue-500/20 px-2.5 py-2 text-[9px] leading-relaxed text-slate-400">
        {zh
          ? "推理链把行情、参数、重大行为压缩成一条可复核的趋势假设。"
          : "The chain compresses price, parameters, and major behavior into a reviewable trend thesis."}
      </div>
    </div>
  );
}

export function ModelParametersPanel({
  intelligence,
  brief,
  candleCount,
  newsCount,
  marketState,
  sourceLabel,
  analysisLinked,
  buttonLabel,
  loading,
  lang,
  onRunAnalysis
}: {
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  candleCount: number;
  newsCount: number;
  marketState: string;
  sourceLabel: string;
  analysisLinked: boolean;
  buttonLabel: string;
  loading: boolean;
  lang: Language;
  onRunAnalysis: () => void;
}) {
  const zh = lang === "zh" || lang === "tc";
  const evidenceLoad = clampDashboard(candleCount * 0.35 + newsCount * 8 + intelligence.confidencePct * 0.25);
  const modeLabel = analysisLinked ? "DGWM LINK" : "FRONTEND";

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        <ModelParameter label={zh ? "模型链路" : "Runtime"} value={modeLabel} tone={analysisLinked ? "text-emerald-300" : "text-blue-300/70"} />
        <ModelParameter label={zh ? "样本窗口" : "Sample"} value={`${candleCount} K`} tone="text-slate-200" />
        <ModelParameter label={zh ? "证据载荷" : "Evidence"} value={`${evidenceLoad}%`} tone="text-emerald-300" />
        <ModelParameter label={zh ? "推理温度" : "Temp"} value="0.18" tone="text-blue-300/70" />
        <ModelParameter label={zh ? "可信阈值" : "Trust"} value={`${intelligence.confidencePct}%`} tone="text-emerald-300" />
        <ModelParameter label={zh ? "风险层" : "Risk"} value={brief.risk} tone={riskTone(intelligence.risk)} />
      </div>
      <div className="rounded border border-amber-400/15 bg-[#031426]/62 px-2.5 py-2 text-[9px] leading-relaxed text-slate-400">
        {zh
          ? `大模型参数只解释当前 ${sourceLabel} / ${marketState} 的趋势假设，不直接替代 DGWM 执行。`
          : `Model parameters explain the ${sourceLabel} / ${marketState} trend thesis without replacing DGWM execution.`}
      </div>
      <button
        onClick={onRunAnalysis}
        disabled={loading}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/20 px-3 py-2 text-[11px] font-black text-slate-200 transition-all hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5 fill-blue-100/80 stroke-none" />
        <span>{buttonLabel}</span>
      </button>
    </div>
  );
}

function DashboardGauge({ label, value, readout, tone }: { label: string; value: number; readout: string; tone: string }) {
  const width = Math.max(6, Math.min(100, value));
  return (
    <div className="min-w-0 rounded-md border border-[#12324a] bg-[#070b14]/82 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
        <div className={`font-mono text-[12px] font-black ${tone}`}>{readout}</div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#000814]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#3b6f91,#6f8fa8)] shadow-[0_0_14px_rgba(54,96,130,0.28)]"
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[7px] font-black uppercase tracking-widest text-slate-700">
        <span>LOW</span>
        <span>{Math.round(width)}</span>
      </div>
    </div>
  );
}

function ModelParameter({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded border border-[#12324a] bg-[#031426]/72 px-2 py-2">
      <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1 truncate font-mono text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}