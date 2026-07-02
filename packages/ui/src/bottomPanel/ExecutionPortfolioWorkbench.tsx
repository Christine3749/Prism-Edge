import { useState } from "react";
import { Calculator, CheckCircle2, CircleAlert, Route, ShieldCheck, WalletCards } from "lucide-react";
import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import { buildExecutionControlPlan } from "./executionControlModel";
import type { ExecutionDirection, ExecutionSource, ExecutionVerdict } from "./executionControlModel";

interface ExecutionPortfolioWorkbenchProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  marketStatus?: MarketDataStatus;
  lang: Language;
  theme: "dark" | "light";
  onSymbolSelect: (symbol: MarketSymbol) => void;
}

export function ExecutionPortfolioWorkbench({
  currentSymbol,
  symbolsList,
  marketStatus,
  lang,
  theme,
  onSymbolSelect
}: ExecutionPortfolioWorkbenchProps) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const [source, setSource] = useState<ExecutionSource>("dgwm");
  const plan = buildExecutionControlPlan(currentSymbol, symbolsList, marketStatus, lang, source);
  const shell = dark ? "bg-[#06111f] text-slate-100" : "bg-[#f7fbff] text-[#102136]";
  const panel = dark ? "border-[#24383b] bg-[#0b1414]" : "border-[#d9e5f0] bg-white";
  const muted = dark ? "text-slate-400" : "text-[#607188]";
  const line = dark ? "border-[#1e3032]" : "border-[#d9e5f0]";

  return (
    <div className={`h-full min-h-0 overflow-y-auto px-4 py-3 ${shell}`}>
      <div className={`mb-3 flex items-center justify-between gap-3 border-b pb-2 ${line}`}>
        <div className="flex min-w-0 items-center gap-3">
          <ShieldCheck className={dark ? "h-4 w-4 text-blue-300" : "h-4 w-4 text-[#2563eb]"} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-black">{zh ? "执行与组合控制台" : "Execution & Portfolio Control"}</div>
            <div className={`mt-0.5 truncate font-mono text-[9px] font-black uppercase tracking-[0.12em] ${muted}`}>
              {zh ? "纸面订单 / 退出成本 / 组合敞口" : "Paper Orders / Exit Cost / Exposure"}
            </div>
          </div>
        </div>
        <div className={`hidden shrink-0 items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] lg:flex ${muted}`}>
          <span>{currentSymbol.id}</span>
          <span>{plan.route.toUpperCase()}</span>
          <span>{verdictLabel(plan.verdict, zh)}</span>
        </div>
      </div>

      <div className="grid gap-3 2xl:grid-cols-[minmax(320px,0.38fr)_minmax(0,1fr)]">
        <aside className="space-y-3">
          <section className={`rounded-md border p-3 ${panel}`}>
            <div className="flex items-center gap-2 text-[13px] font-black">
              <Route className={dark ? "h-4 w-4 text-blue-300" : "h-4 w-4 text-[#2563eb]"} />
              {zh ? "统一订单入口" : "Unified Intent Gate"}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <IntentButton active={source === "dgwm"} label="DGWM" caption={zh ? "门控信号" : "Gate signal"} dark={dark} onClick={() => setSource("dgwm")} />
              <IntentButton active={source === "manual"} label={zh ? "手动意图" : "Manual"} caption={zh ? "调仓请求" : "Order intent"} dark={dark} onClick={() => setSource("manual")} />
            </div>
            <p className={`mt-3 text-[10px] leading-relaxed ${muted}`}>
              {zh ? "两条入口都会进入同一道 Edge Control 核算，不允许绕过退出成本。" : "Both paths enter the same Edge Control ledger; exit cost cannot be bypassed."}
            </p>
          </section>

          <section className={`rounded-md border p-3 ${panel}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[13px] font-black">
                <Calculator className={dark ? "h-4 w-4 text-blue-300" : "h-4 w-4 text-[#2563eb]"} />
                Edge Control
              </div>
              <span className={`rounded border px-2 py-1 font-mono text-[10px] font-black ${verdictBadge(plan.verdict, dark)}`}>
                {verdictLabel(plan.verdict, zh)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <StatTile label={zh ? "预期 ROI" : "Expected ROI"} value={`${plan.expectedRoiPct}%`} dark={dark} />
              <StatTile label={zh ? "ROI 门槛" : "ROI Hurdle"} value={`${plan.roiThresholdPct}%`} dark={dark} />
              <StatTile label={zh ? "进场成本" : "Entry Cost"} value={`${plan.entryCostBps} bps`} dark={dark} />
              <StatTile label={zh ? "退出成本" : "Exit Cost"} value={`${plan.exitCostBps} bps`} dark={dark} />
              <StatTile label={zh ? "仓位上限" : "Max Size"} value={`${plan.maxPositionPct}%`} dark={dark} />
              <StatTile label={zh ? "止损距离" : "Stop Range"} value={`${plan.stopDistancePct}%`} dark={dark} />
            </div>
            <p className={`mt-3 rounded border px-3 py-2 text-[11px] leading-relaxed ${dark ? "border-[#24383b] bg-[#081111] text-slate-300" : "border-[#d9e5f0] bg-[#fbfdff] text-[#44546a]"}`}>
              {plan.reason}
            </p>
          </section>
        </aside>

        <main className="min-w-0 space-y-3">
          <section className={`rounded-md border p-3 ${panel}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[13px] font-black">
                <WalletCards className={dark ? "h-4 w-4 text-blue-300" : "h-4 w-4 text-[#2563eb]"} />
                {zh ? "组合敞口聚合" : "Portfolio Exposure"}
              </div>
              <div className={`font-mono text-[9px] font-black uppercase tracking-[0.12em] ${muted}`}>
                {zh ? "纸面组合" : "Paper portfolio"}
              </div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-4">
              <ExposureCard label={zh ? "总敞口" : "Gross"} value={plan.exposure.grossPct} suffix="%" dark={dark} />
              <ExposureCard label={zh ? "净敞口" : "Net"} value={plan.exposure.netPct} suffix="%" signed dark={dark} />
              <ExposureCard label={zh ? "风险热度" : "Heat"} value={plan.exposure.heatPct} suffix="%" dark={dark} />
              <ExposureCard label={zh ? "现金缓冲" : "Cash"} value={plan.exposure.cashPct} suffix="%" dark={dark} />
            </div>
          </section>

          <section className={`rounded-md border ${panel}`}>
            <div className={`grid grid-cols-[minmax(170px,1.2fr)_72px_86px_86px_86px_104px] border-b px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.12em] ${muted} ${line}`}>
              <span>{zh ? "标的 / 意图" : "Symbol / Intent"}</span>
              <span>Score</span>
              <span>{zh ? "方向" : "Side"}</span>
              <span>{zh ? "目标仓位" : "Target"}</span>
              <span>{zh ? "风险" : "Risk"}</span>
              <span>{zh ? "纸面 PnL" : "Paper PnL"}</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {plan.positions.map((position) => (
                <button
                  key={position.symbol.id}
                  type="button"
                  onClick={() => onSymbolSelect(position.symbol)}
                  className={`grid w-full grid-cols-[minmax(170px,1.2fr)_72px_86px_86px_86px_104px] items-center border-b px-3 py-2 text-left transition-colors ${position.symbol.id === currentSymbol.id ? (dark ? "border-blue-400/25 bg-blue-400/10" : "border-blue-300 bg-blue-50") : (dark ? "border-[#13263d] hover:bg-[#0d1b2e]" : "border-[#e3ebf3] hover:bg-[#f2f7fb]")}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-black">{position.symbol.id}</div>
                    <div className={`mt-0.5 truncate text-[9px] ${muted}`}>{position.symbol.name} · {position.symbol.exchange || position.symbol.market || position.symbol.type}</div>
                  </div>
                  <div className={`font-mono text-[16px] font-black ${scoreTone(position.score, dark)}`}>{position.score}</div>
                  <div className={directionTone(position.direction, dark)}>{directionLabel(position.direction, zh)}</div>
                  <Meter value={position.targetPct} max={16} label={`${position.targetPct}%`} dark={dark} />
                  <Meter value={position.riskPct} max={100} label={`${position.riskPct}%`} dark={dark} danger />
                  <div className={`font-mono text-[12px] font-black ${position.unrealizedPct >= 0 ? (dark ? "text-blue-300" : "text-[#1d4ed8]") : "text-rose-500"}`}>
                    {position.unrealizedPct >= 0 ? "+" : ""}{position.unrealizedPct}%
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className={`grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.38fr)]`}>
            <div className={`rounded-md border p-3 ${panel}`}>
              <div className="flex items-center gap-2 text-[13px] font-black">
                <CheckCircle2 className={dark ? "h-4 w-4 text-blue-300" : "h-4 w-4 text-[#2563eb]"} />
                {zh ? "核算审计链" : "Control Audit"}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {plan.audit.map((item) => (
                  <div key={item.label} className={`flex items-center justify-between gap-3 rounded border px-3 py-2 ${dark ? "border-[#24383b] bg-[#081111]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
                    <span className="min-w-0 truncate text-[11px] font-bold">{item.label}</span>
                    <span className={`shrink-0 font-mono text-[10px] font-black ${item.ok ? (dark ? "text-blue-300" : "text-[#1d4ed8]") : "text-rose-500"}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`rounded-md border p-3 ${panel}`}>
              <div className="flex items-center gap-2 text-[13px] font-black">
                <CircleAlert className={dark ? "h-4 w-4 text-amber-300" : "h-4 w-4 text-amber-700"} />
                {zh ? "真实路由状态" : "Live Route"}
              </div>
              <p className={`mt-3 text-[11px] leading-relaxed ${muted}`}>
                {zh ? "当前只允许纸面订单。真实下单、权限、限额和风控审批尚未接入。" : "Paper orders only. Live orders, permissions, limits, and approval workflows are not connected."}
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function IntentButton({ active, label, caption, dark, onClick }: { active: boolean; label: string; caption: string; dark: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded border px-3 py-2 text-left transition-colors ${active ? activeButton(dark) : quietButton(dark)}`}>
      <div className="text-[12px] font-black">{label}</div>
      <div className="mt-0.5 text-[9px] opacity-70">{caption}</div>
    </button>
  );
}

function StatTile({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`rounded border px-2 py-2 ${dark ? "border-[#24383b] bg-[#081111]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
      <div className={dark ? "font-mono text-[8px] font-black uppercase tracking-widest text-slate-500" : "font-mono text-[8px] font-black uppercase tracking-widest text-[#7c8da3]"}>{label}</div>
      <div className="mt-1 font-mono text-[16px] font-black">{value}</div>
    </div>
  );
}

function ExposureCard({ label, value, suffix, signed = false, dark }: { label: string; value: number; suffix: string; signed?: boolean; dark: boolean }) {
  const display = `${signed && value >= 0 ? "+" : ""}${value}${suffix}`;
  return (
    <div className={`rounded border px-3 py-2 ${dark ? "border-[#24383b] bg-[#081111]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
      <div className={dark ? "font-mono text-[8px] font-black uppercase tracking-widest text-slate-500" : "font-mono text-[8px] font-black uppercase tracking-widest text-[#7c8da3]"}>{label}</div>
      <div className="mt-1 font-mono text-[18px] font-black">{display}</div>
      <div className={dark ? "mt-2 h-1.5 rounded bg-[#102023]" : "mt-2 h-1.5 rounded bg-[#dce8f1]"}>
        <div className={dark ? "h-full rounded bg-blue-300" : "h-full rounded bg-[#2563eb]"} style={{ width: `${Math.max(4, Math.min(100, Math.abs(value)))}%` }} />
      </div>
    </div>
  );
}

function Meter({ value, max, label, dark, danger = false }: { value: number; max: number; label: string; dark: boolean; danger?: boolean }) {
  return (
    <div className="pr-3">
      <div className="mb-1 font-mono text-[11px] font-black">{label}</div>
      <div className={dark ? "h-1.5 rounded bg-[#102023]" : "h-1.5 rounded bg-[#dce8f1]"}>
        <div className={`h-full rounded ${danger ? "bg-amber-400" : dark ? "bg-blue-300" : "bg-[#2563eb]"}`} style={{ width: `${Math.max(4, Math.min(100, (value / max) * 100))}%` }} />
      </div>
    </div>
  );
}

function verdictLabel(verdict: ExecutionVerdict, zh: boolean) {
  if (verdict === "pass") return zh ? "通过" : "PASS";
  if (verdict === "review") return zh ? "复核" : "REVIEW";
  return zh ? "拦截" : "BLOCK";
}

function directionLabel(direction: ExecutionDirection, zh: boolean) {
  if (direction === "long") return zh ? "做多" : "Long";
  if (direction === "short") return zh ? "做空" : "Short";
  return zh ? "等待" : "Hold";
}

function activeButton(dark: boolean) {
  return dark ? "border-blue-500/40 bg-blue-400/15 text-blue-100" : "border-blue-500/45 bg-blue-50 text-blue-700";
}

function quietButton(dark: boolean) {
  return dark ? "border-[#24383b] bg-[#0a1212] text-slate-400" : "border-[#d9e5f0] bg-white text-[#44546a]";
}

function verdictBadge(verdict: ExecutionVerdict, dark: boolean) {
  if (verdict === "pass") return dark ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-emerald-400/40 bg-emerald-50 text-emerald-700";
  if (verdict === "review") return dark ? "border-amber-400/30 bg-amber-400/10 text-amber-300" : "border-amber-400/40 bg-amber-50 text-amber-700";
  return dark ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-rose-400/40 bg-rose-50 text-red-600";
}

function scoreTone(score: number, dark: boolean) {
  if (score >= 82) return dark ? "text-emerald-300" : "text-emerald-700";
  if (score >= 68) return dark ? "text-blue-300" : "text-[#1d4ed8]";
  if (score >= 52) return dark ? "text-amber-300" : "text-amber-700";
  return dark ? "text-rose-300" : "text-red-600";
}

function directionTone(direction: ExecutionDirection, dark: boolean) {
  if (direction === "long") return dark ? "text-emerald-300 text-[11px] font-black" : "text-emerald-700 text-[11px] font-black";
  if (direction === "short") return dark ? "text-rose-300 text-[11px] font-black" : "text-red-600 text-[11px] font-black";
  return dark ? "text-slate-300 text-[11px] font-black" : "text-[#44546a] text-[11px] font-black";
}
