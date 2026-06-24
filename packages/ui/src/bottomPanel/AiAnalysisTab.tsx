import { AlertTriangle, Play, Sparkles } from "lucide-react";
import type { AnalysisRunResponse } from "../../../shared/src/types";
import type { Language } from "../../../shared/src/translations";
import { AiMarkdown } from "./AiMarkdown";

interface AiAnalysisTabProps {
  aiAnalysis: string;
  aiLoading: boolean;
  analysisServiceFallback: boolean;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
  onRunAnalysis: () => void;
}

export function AiAnalysisTab({
  aiAnalysis,
  aiLoading,
  analysisServiceFallback,
  analysisResult,
  lang,
  onRunAnalysis
}: AiAnalysisTabProps) {
  return (
    <div className="h-full flex flex-col justify-between">
      {aiLoading ? (
        <LoadingState lang={lang} />
      ) : aiAnalysis ? (
        <AnalysisOutput
          aiAnalysis={aiAnalysis}
          analysisServiceFallback={analysisServiceFallback}
          analysisResult={analysisResult}
          lang={lang}
        />
      ) : (
        <EmptyState lang={lang} onRunAnalysis={onRunAnalysis} />
      )}
    </div>
  );
}

function LoadingState({ lang }: { lang: Language }) {
  return (
    <div className="flex flex-col items-center justify-center flex-grow py-4 gap-2">
      <div className="relative">
        <span className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin block"></span>
        <Sparkles className="h-3.5 w-3.5 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-[11px] text-white font-bold">{lang === "zh" ? "正在折射多空对称对称率..." : lang === "tc" ? "正在折射多空對稱對稱率..." : "Refracting Technical Symmetries..."}</p>
        <p className="text-[9px] text-slate-500">{lang === "zh" ? "分析烛台图形阵、布林带宽度及 RSI 异常度。" : lang === "tc" ? "分析燭台圖形陣、布林帶寬度及 RSI 異常度。" : "Studying visual candelabra arrays, Bollinger spreads, and RSI anomalies."}</p>
      </div>
    </div>
  );
}

function AnalysisOutput({
  aiAnalysis,
  analysisServiceFallback,
  analysisResult,
  lang
}: {
  aiAnalysis: string;
  analysisServiceFallback: boolean;
  analysisResult?: AnalysisRunResponse | null;
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
      <div className="bg-slate-900 p-3 border border-slate-800 rounded-lg">
        <AiMarkdown text={aiAnalysis} />
      </div>
    </div>
  );
}

function QuantSnapshot({ result, lang }: { result: AnalysisRunResponse; lang: Language }) {
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
      meta: reward ? `CVaR ${formatSignedPercent(reward.cvar)}` : "-"
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
        <div key={card.label} className="border border-slate-800 bg-slate-900/80 rounded-md px-2.5 py-2 min-h-16">
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

function getQuantLabels(lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  return {
    structure: zh ? "市场结构" : "Structure",
    permission: zh ? "交易许可" : "Permission",
    netReward: zh ? "净奖励" : "Net Reward",
    error: zh ? "误差" : "EDG",
    gap: zh ? "谱间隙" : "Gap",
    allowed: zh ? "允许交易" : "Allowed",
    blocked: zh ? "需要降级/拒绝" : "Review or reject",
    riskReasons: zh ? "风险原因" : "Risk reasons",
    regime: {
      trend: zh ? "趋势" : "Trend",
      range: zh ? "震荡" : "Range",
      breakout: zh ? "突破" : "Breakout",
      stress: zh ? "压力" : "Stress",
      transition: zh ? "切换" : "Transition"
    },
    mode: {
      attack: zh ? "进攻" : "Attack",
      defensive: zh ? "防守" : "Defensive",
      reduce_only: zh ? "只减仓" : "Reduce only",
      hedge_only: zh ? "仅对冲" : "Hedge only",
      reject: zh ? "拒绝" : "Reject",
      manual_review: zh ? "人工复核" : "Manual review"
    }
  };
}

function formatRatio(value?: number) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function formatSignedPercent(value: number) {
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function EmptyState({ lang, onRunAnalysis }: { lang: Language; onRunAnalysis: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-grow py-4 text-center">
      <div className="h-8 w-8 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-2">
        <Sparkles className="h-4 w-4" />
      </div>
      <h4 className="text-xs font-bold text-white mb-1">{lang === "zh" ? "棱镜 AI 智能助理" : lang === "tc" ? "稜鏡 AI 智能助理" : "Prism AI Agent Assistant"}</h4>
      <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed mb-3">
        {lang === "zh" ? "根据当前的 K 线视图与技术指标生成实时的量化技术研究与多空对称性分析。" : lang === "tc" ? "根據當前的 K 線視圖與技術指標生成實時的量化技術研究與多空對稱性分析。" : "Obtain a custom generated real-time quant analysis based on the current timeframe candle viewport."}
      </p>
      <button
        onClick={onRunAnalysis}
        className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[10px] rounded-md transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
      >
        <Play className="h-3 w-3 fill-slate-950 stroke-none" />
        <span>{lang === "zh" ? "运行量化智能诊断" : lang === "tc" ? "運行量化智能診斷" : "Run Technical Study"}</span>
      </button>
    </div>
  );
}
