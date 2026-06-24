import { Activity, FlaskConical, PlayCircle, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { QuantBacktestReport, QuantHealth } from "../../../shared/src/types";
import type { Language } from "../../../shared/src/translations";

interface QuantLabPanelProps {
  health: QuantHealth | null;
  backtest: QuantBacktestReport | null;
  loading: boolean;
  error: string;
  canRun: boolean;
  lang: Language;
  onRunBacktest: () => void;
}

export function QuantLabPanel({
  health,
  backtest,
  loading,
  error,
  canRun,
  lang,
  onRunBacktest
}: QuantLabPanelProps) {
  const labels = getLabels(lang);
  const acceptedRate = backtest && backtest.sampleCount > 0
    ? backtest.acceptedSignals / backtest.sampleCount
    : 0;
  const healthReady = Boolean(health?.exists);

  return (
    <div className="border border-cyan-500/15 bg-cyan-950/10 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-black text-slate-100 uppercase tracking-widest">
              {labels.title}
            </div>
            <div className="text-[9px] text-slate-500 truncate">
              {health?.adapter || labels.pending}
            </div>
          </div>
        </div>
        <button
          onClick={onRunBacktest}
          disabled={!canRun || loading}
          className="h-7 px-2 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-500/20"
        >
          <PlayCircle className="h-3 w-3" />
          <span>{loading ? labels.running : labels.run}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <MetricCard
          icon={<Activity className="h-3 w-3" />}
          label={labels.adapter}
          value={healthReady ? labels.ready : labels.offline}
          tone={healthReady ? "text-emerald-300" : "text-yellow-300"}
        />
        <MetricCard label={labels.samples} value={backtest ? String(backtest.sampleCount) : "-"} />
        <MetricCard label={labels.accepted} value={backtest ? formatPercent(acceptedRate) : "-"} />
        <MetricCard label={labels.return} value={backtest ? formatSignedPercent(backtest.cumulativeReturn) : "-"} />
        <MetricCard label={labels.drawdown} value={backtest ? formatPercent(backtest.maxDrawdown) : "-"} />
      </div>

      {backtest && (
        <div className="flex items-center justify-between gap-2 text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-cyan-300" />
            {labels.adapterSource}: {backtest.adapter}
          </span>
          <span>{backtest.serviceFallback ? labels.fallback : labels.dgwm}</span>
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
    running: zh ? "回测中" : "Running",
    adapter: zh ? "适配器" : "Adapter",
    ready: zh ? "已连接" : "Ready",
    offline: zh ? "未连接" : "Offline",
    samples: zh ? "样本" : "Samples",
    accepted: zh ? "通过率" : "Pass Rate",
    return: zh ? "收益" : "Return",
    drawdown: zh ? "回撤" : "Drawdown",
    adapterSource: zh ? "引擎" : "Engine",
    fallback: zh ? "Node 兜底" : "Node fallback",
    dgwm: zh ? "DGWM 通道" : "DGWM route"
  };
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}
