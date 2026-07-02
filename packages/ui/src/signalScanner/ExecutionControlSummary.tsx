import { Calculator, Route, ShieldCheck, WalletCards } from "lucide-react";
import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import { buildExecutionControlPlan } from "../bottomPanel/executionControlModel";

interface ExecutionControlSummaryProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  marketStatus?: MarketDataStatus;
  lang: Language;
  theme: "dark" | "light";
}

export function ExecutionControlSummary({ currentSymbol, symbolsList, marketStatus, lang, theme }: ExecutionControlSummaryProps) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const plan = buildExecutionControlPlan(currentSymbol, symbolsList, marketStatus, lang);
  const source = marketStatus?.source || currentSymbol.lastSource || currentSymbol.dataProvider || currentSymbol.exchange || "paper";
  const feedState = marketStatus?.state || currentSymbol.lastDataState || "feed";

  return (
    <div className={`flex h-full min-h-0 flex-col shadow-[18px_0_44px_rgba(0,12,18,0.28)] ${dark ? "border-r border-white/10 bg-[#07111f] text-slate-200" : "border-r border-[#d9e5f0] bg-[#f7fbff] text-[#102136]"}`}>
      <div className={`border-b px-3 py-3 ${dark ? "border-white/10 bg-[#0a1626]" : "border-[#d9e5f0] bg-white"}`}>
        <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {zh ? "IV / 执行控制" : "IV / Edge Control"}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`truncate text-[15px] font-black ${dark ? "text-white" : "text-[#102136]"}`}>{zh ? "纸面执行与组合" : "Paper Execution"}</div>
            <div className="mt-1 truncate font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">{source} / {feedState}</div>
          </div>
          <div className={`shrink-0 text-right font-mono ${verdictTone(plan.verdict, dark)}`}>
            <div className="text-[24px] font-black leading-none">{verdictLabel(plan.verdict, zh)}</div>
            <div className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-500">EDGE</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section className={`border p-3 ${panelTone(dark)}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
            <Calculator className="h-3.5 w-3.5" />
            {zh ? "Edge Control 核算" : "Edge Control Ledger"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[8px] font-black uppercase tracking-widest">
            <MetricPill label={zh ? "预期 ROI" : "Exp ROI"} value={`${plan.expectedRoiPct}%`} dark={dark} />
            <MetricPill label={zh ? "门槛" : "Hurdle"} value={`${plan.roiThresholdPct}%`} dark={dark} />
            <MetricPill label={zh ? "净优势" : "Net Edge"} value={`${plan.netEdgePct >= 0 ? "+" : ""}${plan.netEdgePct}%`} dark={dark} />
            <MetricPill label={zh ? "仓位上限" : "Max Size"} value={`${plan.maxPositionPct}%`} dark={dark} />
          </div>
          <p className={`mt-3 line-clamp-4 text-[10px] leading-relaxed ${dark ? "text-slate-400" : "text-[#607188]"}`}>{plan.reason}</p>
        </section>

        <section className={`mt-3 border p-3 ${panelTone(dark)}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-slate-400" : "text-slate-600"}`}>
            <WalletCards className="h-3.5 w-3.5" />
            {zh ? "组合敞口" : "Portfolio Exposure"}
          </div>
          <div className="mt-3 space-y-2">
            <ExposureBar label={zh ? "总敞口" : "Gross"} value={plan.exposure.grossPct} dark={dark} />
            <ExposureBar label={zh ? "净敞口" : "Net"} value={Math.abs(plan.exposure.netPct)} signed={plan.exposure.netPct} dark={dark} />
            <ExposureBar label={zh ? "风险热度" : "Heat"} value={plan.exposure.heatPct} dark={dark} />
          </div>
        </section>

        <section className={`mt-3 border p-3 ${panelTone(dark)}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-amber-300" : "text-amber-700"}`}>
            <Route className="h-3.5 w-3.5" />
            {zh ? "执行路由" : "Execution Route"}
          </div>
          <div className={`mt-3 border px-2 py-2 ${dark ? "border-white/10 bg-[#06101d]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
            <div className={`text-[11px] font-black ${dark ? "text-slate-200" : "text-[#102136]"}`}>
              {plan.route === "paper" ? (zh ? "纸面执行队列" : "Paper queue") : (zh ? "已拦截" : "Blocked")}
            </div>
            <div className={`mt-1 text-[9px] leading-relaxed ${dark ? "text-slate-500" : "text-[#607188]"}`}>
              {zh ? "真实交易路由未接入；这里只记录模拟订单和风险预算。" : "Live routing is disabled; this layer records simulated orders and risk budget only."}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricPill({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`min-w-0 border px-2 py-1.5 ${dark ? "border-white/10 bg-[#050b14]" : "border-[#d9e5f0] bg-[#f7fbff]"}`}>
      <div className={dark ? "truncate text-slate-600" : "truncate text-[#72839a]"}>{label}</div>
      <div className={dark ? "mt-1 truncate text-blue-200/85" : "mt-1 truncate text-[#1d4ed8]"}>{value}</div>
    </div>
  );
}

function ExposureBar({ label, value, signed, dark }: { label: string; value: number; signed?: number; dark: boolean }) {
  const display = signed === undefined ? `${value}%` : `${signed >= 0 ? "+" : ""}${signed}%`;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[9px] font-black uppercase tracking-widest text-slate-500">
        <span>{label}</span>
        <span>{display}</span>
      </div>
      <div className={dark ? "h-1.5 rounded bg-[#102023]" : "h-1.5 rounded bg-[#dce8f1]"}>
        <div className={dark ? "h-full rounded bg-blue-300" : "h-full rounded bg-[#2563eb]"} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function panelTone(dark: boolean) {
  return dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white";
}

function verdictLabel(verdict: string, zh: boolean) {
  if (verdict === "pass") return zh ? "通过" : "PASS";
  if (verdict === "review") return zh ? "复核" : "REVIEW";
  return zh ? "拦截" : "BLOCK";
}

function verdictTone(verdict: string, dark: boolean) {
  if (verdict === "pass") return dark ? "text-emerald-300" : "text-emerald-700";
  if (verdict === "review") return dark ? "text-amber-300" : "text-amber-700";
  return dark ? "text-rose-300" : "text-red-600";
}
