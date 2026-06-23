import { AlertTriangle, Play, Sparkles } from "lucide-react";
import type { Language } from "../../../shared/src/translations";
import { AiMarkdown } from "./AiMarkdown";

interface AiAnalysisTabProps {
  aiAnalysis: string;
  aiLoading: boolean;
  analysisServiceFallback: boolean;
  lang: Language;
  onRunAnalysis: () => void;
}

export function AiAnalysisTab({
  aiAnalysis,
  aiLoading,
  analysisServiceFallback,
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
  lang
}: {
  aiAnalysis: string;
  analysisServiceFallback: boolean;
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
      <div className="bg-slate-900 p-3 border border-slate-800 rounded-lg">
        <AiMarkdown text={aiAnalysis} />
      </div>
    </div>
  );
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
