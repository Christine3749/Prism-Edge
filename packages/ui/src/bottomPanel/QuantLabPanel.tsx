import { Activity, Cpu, FlaskConical, PlayCircle, Radar, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type {
  QuantBacktestReport,
  QuantHealth,
  QuantModelEntry,
  QuantModelRegistry,
  QuantRuntimeDiagnostic
} from "../../../shared/src/types";
import type { Language } from "../../../shared/src/translations";
import type { MembershipNotice, QuantFeatureAccess } from "./types";

interface QuantLabPanelProps {
  health: QuantHealth | null;
  models: QuantModelRegistry | null;
  backtest: QuantBacktestReport | null;
  runtimeDiagnostic?: QuantRuntimeDiagnostic | null;
  loading: boolean;
  runtimeLoading: boolean;
  error: string;
  membershipNotice?: MembershipNotice | null;
  featureAccess?: QuantFeatureAccess;
  canRun: boolean;
  lang: Language;
  onRunBacktest: () => void;
  onRunRuntime: () => void;
}

export function QuantLabPanel({
  health,
  models,
  backtest,
  runtimeDiagnostic,
  loading,
  runtimeLoading,
  error,
  membershipNotice,
  featureAccess,
  canRun,
  lang,
  onRunBacktest,
  onRunRuntime
}: QuantLabPanelProps) {
  const labels = getLabels(lang);
  const acceptedRate = backtest && backtest.sampleCount > 0
    ? backtest.acceptedSignals / backtest.sampleCount
    : 0;
  const modelEntries = models?.models ?? [];
  const readyModels = modelEntries.filter((model) => model.status === "ready").length;
  const defaultModel = modelEntries.find((model) => model.id === models?.defaultModelId);
  const healthReady = Boolean(health?.exists || readyModels > 0);
  const runtimeLocked = membershipNotice?.featureKey === "runtime_diagnostic" || Boolean(featureAccess && !featureAccess.loading && !featureAccess.runtimeDiagnostic);
  const backtestLocked = membershipNotice?.featureKey === "backtest" || Boolean(featureAccess && !featureAccess.loading && !featureAccess.backtest);
  const quantProLocked = Boolean(featureAccess?.active && (!featureAccess.runtimeDiagnostic || !featureAccess.backtest));

  return (
    <div className="border border-blue-600/35 bg-blue-950/70 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="h-3.5 w-3.5 text-blue-300/70 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-black text-slate-100 uppercase tracking-widest">
              {labels.title}
            </div>
            <div className="text-[9px] text-slate-500 truncate">
              {defaultModel ? `${labels.defaultModel}: ${defaultModel.name}` : health?.adapter || labels.pending}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {featureAccess && (
            <span className={`hidden sm:inline-flex h-7 items-center rounded border px-2 text-[9px] font-black uppercase tracking-wider ${featureAccess.active ? "border-blue-600/35 text-blue-300/70" : "border-amber-500/30 text-amber-300"}`}>
              {featureAccess.loading ? labels.checking : featureAccess.planLabel}
            </span>
          )}
          <button
            onClick={onRunRuntime}
            disabled={!canRun || runtimeLoading || runtimeLocked}
            title={runtimeLocked ? labels.quantProRequired : labels.runtime}
            className="h-7 px-2 rounded border border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200 text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-fuchsia-500/20"
          >
            <Radar className="h-3 w-3" />
            <span>{runtimeLoading ? labels.runtimeRunning : labels.runtime}</span>
          </button>
          <button
            onClick={onRunBacktest}
            disabled={!canRun || loading || backtestLocked}
            title={backtestLocked ? labels.quantProRequired : labels.run}
            className="h-7 px-2 rounded border border-blue-600/35 bg-[#123a63] text-slate-200 text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#174976]"
          >
            <PlayCircle className="h-3 w-3" />
            <span>{loading ? labels.running : labels.run}</span>
          </button>
        </div>
      </div>

      {modelEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1.5">
          {modelEntries.slice(0, 4).map((model) => (
            <ModelTile
              key={model.id}
              model={model}
              isDefault={model.id === models?.defaultModelId}
              labels={labels}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-8 gap-2">
        <MetricCard
          icon={<Activity className="h-3 w-3" />}
          label={labels.adapter}
          value={healthReady ? labels.ready : labels.offline}
          tone={healthReady ? "text-emerald-300" : "text-yellow-300"}
        />
        <MetricCard label={labels.models} value={modelEntries.length ? `${readyModels}/${modelEntries.length}` : "-"} />
        <MetricCard label={labels.samples} value={backtest ? String(backtest.sampleCount) : "-"} />
        <MetricCard label={labels.accepted} value={backtest ? formatPercent(acceptedRate) : "-"} />
        <MetricCard label={labels.exposure} value={backtest?.exposurePct !== undefined ? formatPercent(backtest.exposurePct) : "-"} />
        <MetricCard label={labels.return} value={backtest ? formatSignedPercent(backtest.cumulativeReturn) : "-"} />
        <MetricCard label={labels.excess} value={backtest?.excessReturn !== undefined ? formatSignedPercent(backtest.excessReturn) : "-"} />
        <MetricCard label={labels.drawdown} value={backtest ? formatPercent(backtest.maxDrawdown) : "-"} />
      </div>

      {backtest && (
        <div className="flex items-center justify-between gap-2 text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-blue-300/70" />
            {labels.adapterSource}: {backtest.adapter}
          </span>
          <span>{backtest.serviceFallback ? labels.fallback : labels.dgwm} · {labels.horizon} {backtest.horizon ?? 1} · {labels.cost} {backtest.costBps ?? 5}bps</span>
        </div>
      )}

      {runtimeDiagnostic && (
        <div className={`text-[10px] rounded px-2 py-1 border ${runtimeDiagnostic.accepted ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100"}`}>
          {labels.runtime}: {runtimeDiagnostic.accepted ? labels.acceptedRuntime : labels.rejectedRuntime}
          <span className="text-slate-400"> · {runtimeDiagnostic.elapsedMs}ms</span>
        </div>
      )}

      {membershipNotice && membershipNotice.featureKey !== "quant_lab" && (
        <div className="flex items-center justify-between gap-2 rounded border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100">
          <span>{membershipNotice.message}</span>
          <a href={membershipNotice.href} className="shrink-0 font-black text-amber-200 no-underline hover:text-amber-100">
            {membershipNotice.actionLabel}
          </a>
        </div>
      )}

      {!membershipNotice && quantProLocked && (
        <div className="flex items-center justify-between gap-2 rounded border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100">
          <span>{labels.quantProRequired}</span>
          <a href="/membership" className="shrink-0 font-black text-amber-200 no-underline hover:text-amber-100">
            {labels.viewPlan}
          </a>
        </div>
      )}

      {error && (
        <div className="text-[10px] text-yellow-200 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1">
          {error}
        </div>
      )}
    </div>
  );
}

function ModelTile({
  model,
  isDefault,
  labels
}: {
  model: QuantModelEntry;
  isDefault: boolean;
  labels: ReturnType<typeof getLabels>;
}) {
  return (
    <div className="min-w-0 border border-slate-800 bg-slate-950/60 rounded-md px-2 py-1.5" title={model.root}>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <span className="flex items-center gap-1 min-w-0 text-[9px] font-black text-slate-100 uppercase tracking-wider">
          <Cpu className="h-3 w-3 text-blue-300/70 shrink-0" />
          <span className="truncate">{model.name}</span>
        </span>
        <span className={`shrink-0 text-[8px] font-black uppercase ${statusTone(model.status)}`}>
          {labels.status[model.status]}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[8px] text-slate-500 min-w-0">
        <span className="truncate">{model.role}{isDefault ? ` · ${labels.default}` : ""}</span>
        <span className="shrink-0">{model.version || model.gitCommit || model.kind}{model.dirty ? ` · ${labels.dirty}` : ""}</span>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="border border-slate-800 bg-slate-950/60 rounded-md px-2 py-1.5 min-h-12">
      <div className="text-[8px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-[12px] font-black mt-1 ${tone || "text-slate-100"}`}>{value}</div>
    </div>
  );
}

function getLabels(lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  return {
    title: zh ? "量化实验室" : "Quant Lab",
    pending: zh ? "等待适配器状态" : "Waiting for adapter status",
    run: zh ? "跑回测" : "Backtest",
    checking: zh ? "校验中" : "Checking",
    quantProRequired: zh ? "DGWM Runtime 与回测需要 Quant Pro 权限。" : "DGWM runtime and backtests require Quant Pro.",
    viewPlan: zh ? "查看方案" : "View plan",
    running: zh ? "回测中" : "Running",
    runtime: zh ? "真实诊断" : "Runtime",
    runtimeRunning: zh ? "诊断中" : "Runtime",
    acceptedRuntime: zh ? "已通过" : "accepted",
    rejectedRuntime: zh ? "未放行" : "rejected",
    adapter: zh ? "适配器" : "Adapter",
    models: zh ? "模型" : "Models",
    ready: zh ? "已连接" : "Ready",
    offline: zh ? "未连接" : "Offline",
    samples: zh ? "样本" : "Samples",
    accepted: zh ? "通过率" : "Pass Rate",
    exposure: zh ? "曝险" : "Exposure",
    return: zh ? "前向收益" : "Forward Return",
    excess: zh ? "相对持有" : "Vs Hold",
    drawdown: zh ? "回撤" : "Drawdown",
    adapterSource: zh ? "引擎" : "Engine",
    fallback: zh ? "Node 兜底" : "Node fallback",
    dgwm: zh ? "DGWM 通道" : "DGWM route",
    horizon: zh ? "持有" : "Hold",
    cost: zh ? "成本" : "Cost",
    default: zh ? "默认" : "default",
    defaultModel: zh ? "默认模型" : "Default model",
    dirty: zh ? "dirty" : "dirty",
    status: {
      ready: zh ? "可用" : "ready",
      degraded: zh ? "降级" : "degraded",
      missing: zh ? "缺失" : "missing"
    }
  };
}

function statusTone(status: QuantModelEntry["status"]) {
  if (status === "ready") return "text-emerald-300";
  if (status === "missing") return "text-rose-300";
  return "text-yellow-300";
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}



