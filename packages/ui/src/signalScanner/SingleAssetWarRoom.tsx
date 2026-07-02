import { buildPrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol, NewsItem } from "@shared/types";
import type { Language } from "@shared/translations";
import { formatDeskPrice } from "./formatters";
import { WarRoomActionStack } from "./PrimitiveCells";
import { EvidenceStrip } from "./EvidenceStrip";
import { WarRoomFundamentalSnapshot } from "./FundamentalSnapshot";
import { WarRoomNarrativeList, StrategyEventTape } from "./NarrativePanels";
import { WarRoomOrderGraphPanel } from "./OrderGraphPanel";
import { warScoreTone } from "./toneClasses";
import type { IntelEvent, IntelStats, StrategySuggestion } from "./types";

interface SingleAssetWarRoomProps {
  currentSymbol: MarketSymbol;
  events: IntelEvent[];
  stats: IntelStats;
  suggestions: StrategySuggestion[];
  newsItems: NewsItem[];
  newsLoading: boolean;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
  integratedBottom: boolean;
  onSymbolSelect: (symbol: MarketSymbol) => void;
}

export function SingleAssetWarRoom({
  currentSymbol,
  events,
  stats,
  suggestions,
  newsItems,
  newsLoading,
  marketStatus,
  analysisResult,
  lang,
  integratedBottom,
  onSymbolSelect
}: SingleAssetWarRoomProps) {
  const zh = lang === "zh" || lang === "tc";
  const intelligence = buildPrismIntelligence(currentSymbol, [], marketStatus, analysisResult);
  const brief = describePrismIntelligence(intelligence, currentSymbol, lang);
  const sourceLabel = marketStatus?.provider || marketStatus?.source || currentSymbol.dataProvider || currentSymbol.lastSource || currentSymbol.exchange || "gateway";
  const feedState = marketStatus?.state || currentSymbol.lastDataState || "local";
  const priceText = formatDeskPrice(currentSymbol.price, currentSymbol.precision);
  const deskTabs = ["FUNDAMENTALS", "EVENTS", "NEWS", "FLOW", "RISK", "DGWM", "SHORTS", "INSIDERS", "FEED"];
  const marketCapProxy = currentSymbol.type === "crypto" ? "CRYPTO" : (currentSymbol.exchange || currentSymbol.market || "EQUITY").toUpperCase();
  const thesisState = intelligence.score >= 68
    ? (zh ? "可推进" : "Advance")
    : intelligence.score >= 52
      ? (zh ? "等待确认" : "Wait Confirm")
      : (zh ? "降低优先级" : "De-prioritize");
  const thesisStateTone = intelligence.score >= 68
    ? "text-emerald-300"
    : intelligence.score >= 52
      ? "text-amber-300"
      : "text-rose-300";

  return (
    <>
      <div className="border-b border-[#12324a] bg-[#000814]">
        <div className="flex h-8 items-center justify-between gap-3 overflow-hidden border-b border-[#12324a] bg-[#000814] px-2 pr-10">
          <div data-desk-tabs className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
            {deskTabs.map((item, index) => (
              <span
                key={item}
                className={`shrink-0 border-r border-[#0c253a] px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] ${index === 0 ? "bg-blue-500/25 text-blue-100/80 shadow-[inset_0_-2px_0_rgba(54,96,130,0.75)]" : "text-slate-500"}`}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="hidden shrink-0 items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-slate-500 2xl:flex">
            <span className="text-blue-300/70">{currentSymbol.id}</span>
            <span>/</span>
            <span>{sourceLabel}</span>
            <span>/</span>
            <span>{feedState}</span>
            <span>/</span>
            <span className={warScoreTone(intelligence.score)}>MSIR {intelligence.score}</span>
            <span>/</span>
            <span>{stats.feedIssues} FEED</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#000814]" style={{ backgroundImage: "linear-gradient(rgba(54,96,130,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(54,96,130,0.04) 1px, transparent 1px), radial-gradient(circle at 18% 0%, rgba(42,82,120,0.08), transparent 34%)", backgroundSize: "24px 24px, 24px 24px, 100% 100%" }}>
        <div className="grid min-h-full grid-rows-[270px_minmax(360px,1fr)]">
          <WarRoomFundamentalSnapshot
            currentSymbol={currentSymbol}
            intelligence={intelligence}
            brief={brief}
            sourceLabel={sourceLabel}
            feedState={feedState}
            marketCapProxy={marketCapProxy}
            priceText={priceText}
            thesisState={thesisState}
            thesisStateTone={thesisStateTone}
            lang={lang}
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.02fr)_minmax(312px,0.82fr)]">
            <div className="min-w-0">
              <WarRoomNarrativeList
                newsItems={newsItems}
                loading={newsLoading}
                events={events}
                symbol={currentSymbol}
                lang={lang}
              />
              <StrategyEventTape events={events} lang={lang} onSymbolSelect={onSymbolSelect} />
            </div>

            <div className="min-w-0">
              <WarRoomOrderGraphPanel
                intelligence={intelligence}
                symbol={currentSymbol}
                sourceLabel={sourceLabel}
                feedState={feedState}
                lang={lang}
              />
              <WarRoomActionStack suggestions={suggestions} lang={lang} />
            </div>
          </div>
        </div>

        {!integratedBottom && (
          <EvidenceStrip
            currentSymbol={currentSymbol}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            lang={lang}
          />
        )}
      </div>

      {!integratedBottom && (
        <div className="border-t border-[#12324a] bg-[#000814] p-2.5">
          <div className="border border-[#12324a] bg-[#061a2b] p-2 text-[9px] leading-relaxed text-slate-500">
            <div className="mb-1 font-mono font-black uppercase tracking-widest text-slate-400">
              {zh ? "作战室职责" : "War Room Role"}
            </div>
            {zh
              ? "作战室只处理当前标的：先形成假设，再压缩事件、风险、数据和 DGWM 门控。"
              : "The war room is scoped to the selected asset: thesis first, then events, risk, feed, and DGWM gates."}
          </div>
        </div>
      )}
    </>
  );
}
