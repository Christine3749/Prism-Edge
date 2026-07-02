import { Database } from "lucide-react";
import { buildPrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import { formatSigned } from "./formatters";
import { evidenceBar, evidenceTone } from "./toneClasses";
import type { EvidenceItem } from "./types";

export function EvidenceStrip({
  currentSymbol,
  marketStatus,
  analysisResult,
  lang
}: {
  currentSymbol: MarketSymbol;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const intelligence = buildPrismIntelligence(currentSymbol, [], marketStatus, analysisResult);
  const brief = describePrismIntelligence(intelligence, currentSymbol, lang);
  const dataSource = marketStatus?.provider || marketStatus?.source || currentSymbol.dataProvider || currentSymbol.lastSource || "gateway";
  const items: EvidenceItem[] = [
    {
      label: zh ? "评分" : "Score",
      value: String(intelligence.score),
      sub: brief.setup,
      tone: intelligence.score >= 68 ? "cyan" : intelligence.score >= 55 ? "slate" : "amber",
      width: intelligence.score
    },
    {
      label: zh ? "20K 动量" : "20K Momentum",
      value: `${formatSigned(intelligence.momentumPct)}%`,
      sub: brief.bias,
      tone: intelligence.momentumPct >= 0 ? "emerald" : "rose",
      width: Math.min(100, Math.max(8, Math.abs(intelligence.momentumPct) * 12))
    },
    {
      label: zh ? "成交量" : "Volume",
      value: `${intelligence.volumeRatio.toFixed(1)}x`,
      sub: intelligence.volumeRatio >= 1.4 ? (zh ? "放量" : "Expansion") : (zh ? "常态" : "Normal"),
      tone: intelligence.volumeRatio >= 1.4 ? "cyan" : "slate",
      width: Math.min(100, Math.max(8, intelligence.volumeRatio * 42))
    },
    {
      label: zh ? "回撤" : "Drawdown",
      value: `${formatSigned(intelligence.drawdownPct)}%`,
      sub: brief.risk,
      tone: intelligence.drawdownPct < -8 ? "amber" : "slate",
      width: Math.min(100, Math.max(8, Math.abs(intelligence.drawdownPct) * 5))
    },
    {
      label: zh ? "数据可信" : "Data Confidence",
      value: `${intelligence.confidencePct}%`,
      sub: dataSource,
      tone: intelligence.confidencePct >= 85 ? "emerald" : intelligence.confidencePct >= 65 ? "cyan" : "amber",
      width: intelligence.confidencePct
    },
    {
      label: "DGWM",
      value: analysisResult ? "READY" : "WAIT",
      sub: analysisResult ? (analysisResult.meta?.engine || "runtime") : (zh ? "待复核" : "review pending"),
      tone: analysisResult ? "emerald" : "cyan",
      width: analysisResult ? 96 : 58
    }
  ];

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[#1d4d6d]/70 bg-[#031426]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-between border-b border-[#12324a]/80 bg-[#06213a]/70 px-2.5 py-2">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-blue-200/70">
          <Database className="h-3 w-3" />
          {zh ? "各类指标" : "Evidence Strip"}
        </div>
        <div className="font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">
          {currentSymbol.id} · {zh ? "证据压缩" : "signal compression"}
        </div>
      </div>
      <div className="grid grid-cols-6 divide-x divide-[#12324a]/80">
        {items.map((item) => (
          <EvidenceTile key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}

function EvidenceTile({ item }: { item: EvidenceItem }) {
  return (
    <div className="min-w-0 px-2.5 py-2.5">
      <div className="truncate text-[7px] font-black uppercase tracking-widest text-slate-600">{item.label}</div>
      <div className={`mt-1 truncate font-mono text-[14px] font-black ${evidenceTone(item.tone)}`}>{item.value}</div>
      <div className="mt-0.5 truncate text-[7px] font-bold text-slate-500">{item.sub}</div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#000814]">
        <div className={`h-full rounded-full ${evidenceBar(item.tone)}`} style={{ width: `${Math.max(6, Math.min(100, item.width))}%` }} />
      </div>
    </div>
  );
}
