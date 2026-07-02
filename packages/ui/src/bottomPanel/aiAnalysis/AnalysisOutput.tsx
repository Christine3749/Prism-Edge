import { AlertTriangle, Crown, Sparkles } from "lucide-react";
import type { AnalysisRunResponse, QuantBacktestReport, QuantHealth, QuantModelRegistry } from "@shared/types";
import type { Language } from "@shared/translations";
import { AiMarkdown } from "../AiMarkdown";
import { QuantLabPanel } from "../QuantLabPanel";
import type { MembershipNotice, QuantFeatureAccess } from "../types";
import { formatRatio, formatSignedPercent } from "./helpers";
import { getQuantLabels } from "./quantLabels";

export function MembershipNoticeBanner({ notice }: { notice: MembershipNotice }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-100">
      <div className="flex min-w-0 items-start gap-2">
        <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
        <div className="min-w-0">
          <div className="font-black text-amber-100">{notice.title}</div>
          <div className="mt-0.5 leading-relaxed text-amber-100/80">{notice.message}</div>
        </div>
      </div>
      <a href={notice.href} className="shrink-0 rounded border border-amber-300/40 px-2 py-1 font-black text-amber-100 no-underline hover:bg-amber-300/10">
        {notice.actionLabel}
      </a>
    </div>
  );
}

export function LoadingState({ lang }: { lang: Language }) {
  return (
    <div className="flex flex-col items-center justify-center flex-grow py-4 gap-2">
      <div className="relative">
        <span className="h-6 w-6 rounded-full border-2 border-blue-500/30 border-t-transparent animate-spin block"></span>
        <Sparkles className="h-3.5 w-3.5 text-blue-300/75 absolute inset-0 m-auto animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-[11px] text-white font-bold">{lang === "zh" ? "正在折射多空对称对称率..." : lang === "tc" ? "正在折射多空對稱對稱率..." : "Refracting Technical Symmetries..."}</p>
        <p className="text-[9px] text-slate-500">{lang === "zh" ? "分析烛台图形阵、布林带宽度及 RSI 异常度。" : lang === "tc" ? "分析燭台圖形陣、布林帶寬度及 RSI 異常度。" : "Studying visual candelabra arrays, Bollinger spreads, and RSI anomalies."}</p>
      </div>
    </div>
  );
}

export function AnalysisOutput({
  aiAnalysis,
  analysisServiceFallback,
  analysisResult,
  quantHealth,
  quantModels,
  backtest,
  backtestLoading,
  runtimeLoading,
  backtestError,
  membershipNotice,
  featureAccess,
  onRunBacktest,
  onRunRuntime,
  lang
}: {
  aiAnalysis: string;
  analysisServiceFallback: boolean;
  analysisResult?: AnalysisRunResponse | null;
  quantHealth: QuantHealth | null;
  quantModels: QuantModelRegistry | null;
  backtest: QuantBacktestReport | null;
  backtestLoading: boolean;
  runtimeLoading: boolean;
  backtestError: string;
  membershipNotice?: MembershipNotice | null;
  featureAccess?: QuantFeatureAccess;
  onRunBacktest: () => void;
  onRunRuntime: () => void;
  lang: Language;
}) {
  return (
    <div className="space-y-2 max-h-44 sm:max-h-none overflow-y-auto pr-1">
      {analysisServiceFallback && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-300 text-[10px] leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
          <span>{lang === "zh" ? "后端模型服务未连接或不可用，当前显示棱镜本地模拟接口输出。" : lang === "tc" ? "後端模型服務未連接或不可用，當前顯示稜鏡本地模擬接口輸出。" : "Backend model service is unavailable. Local Prism-Edge simulator output is shown."}</span>
        </div>
      )}
      {analysisResult && <QuantSnapshot result={analysisResult} lang={lang} />}
      <QuantLabPanel
        health={quantHealth}
        models={quantModels}
        backtest={backtest}
        runtimeDiagnostic={analysisResult?.runtimeDiagnostic}
        loading={backtestLoading}
        runtimeLoading={runtimeLoading}
        error={backtestError}
        membershipNotice={membershipNotice}
        featureAccess={featureAccess}
        canRun={Boolean(analysisResult)}
        lang={lang}
        onRunBacktest={onRunBacktest}
        onRunRuntime={onRunRuntime}
      />
      <div className="bg-[#031426] p-3 border border-[#12324a] rounded-lg">
        <AiMarkdown text={aiAnalysis} />
      </div>
    </div>
  );
}

export function QuantSnapshot({ result, lang }: { result: AnalysisRunResponse; lang: Language }) {
  const permission = result.tradePermission;
  const reward = result.netReward;
  const labels = getQuantLabels(lang);
  const cards = [
    {
      label: labels.structure,
      value: result.regime ? labels.regime[result.regime] : "-",
      meta: `${labels.error} ${formatRatio(result.structuralError)}`
    },
    {
      label: labels.permission,
      value: permission ? labels.mode[permission.mode] : "-",
      meta: permission?.allowed ? labels.allowed : labels.blocked,
      tone: permission?.allowed ? "text-emerald-300" : "text-rose-300"
    },
    {
      label: labels.netReward,
      value: reward ? formatSignedPercent(reward.mean) : "-",
      meta: reward ? `Proxy CVaR ${formatSignedPercent(reward.cvar)}` : "-"
    },
    {
      label: "Bellman",
      value: formatRatio(result.bellmanResidual),
      meta: `${labels.gap} ${formatRatio(result.spectralGap)}`
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map((card) => (
        <div key={card.label} className="border border-[#12324a] bg-[#031426]/88 rounded-md px-2.5 py-2 min-h-16">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{card.label}</div>
          <div className={`text-[13px] font-black mt-1 ${card.tone || "text-slate-100"}`}>{card.value}</div>
          <div className="text-[9px] text-slate-500 mt-0.5 truncate">{card.meta}</div>
        </div>
      ))}
      {permission && permission.reasons.length > 0 && (
        <div className="col-span-2 lg:col-span-4 border border-rose-500/20 bg-rose-500/10 rounded-md px-2.5 py-1.5 text-[10px] text-rose-200">
          <span className="font-bold">{labels.riskReasons}: </span>
          <span>{permission.reasons.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}

function ActionStep({ index, title, meta }: { index: string; title: string; meta: string }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 rounded border border-[#12324a] bg-[#031426]/72 p-2">
      <div className="font-mono text-[10px] font-black text-blue-300/70">{index}</div>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-black text-slate-100">{title}</div>
        <div className="mt-0.5 truncate text-[8px] text-slate-500">{meta}</div>
      </div>
    </div>
  );
}

function DecisionMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded border border-[#12324a] bg-[#031426]/72 px-2.5 py-2">
      <div className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</div>
      <div className={`mt-1 truncate text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}
