import { useEffect, useRef, useState } from "react";
import {
  AnalysisRunRequest,
  AnalysisRunResponse,
  Candle,
  IndicatorConfig,
  MarketDataStatus,
  MarketSymbol,
  NewsItem,
  OrderBookItem,
  QuantBacktestReport,
  QuantHealth,
  QuantModelRegistry
} from "../../shared/src/types";
import { generateMarketTrades, generateOrderBook, MarketTrade } from "../../shared/src/mockMarketData";
import { hsFetch, readHsAccessToken } from "../../shared/src/hsAuth";
import {
  hasMembershipFeature,
  loadMembershipSnapshot,
  membershipIsActive,
  membershipPlanLabel
} from "../../shared/src/membership";
import type { HsMembershipSnapshot } from "../../shared/src/membership";
import { Language, useTranslation } from "../../shared/src/translations";
import { AiAnalysisTab } from "./bottomPanel/AiAnalysisTab";
import { BottomPanelTabs } from "./bottomPanel/BottomPanelTabs";
import { ExecutionPortfolioWorkbench } from "./bottomPanel/ExecutionPortfolioWorkbench";
import { MarketSignalMatrixWorkbench } from "./bottomPanel/MarketSignalMatrixWorkbench";
import { NewsTab } from "./bottomPanel/NewsTab";
import { OrderBookTab } from "./bottomPanel/OrderBookTab";
import { TradingSignalsWorkbench } from "./bottomPanel/TradingSignalsWorkbench";
import { TradesTab } from "./bottomPanel/TradesTab";
import { buildIndicatorList, formatAnalysisResponse } from "./bottomPanel/analysisFormat";
import type { BottomPanelTab, MembershipNotice, QuantFeatureAccess } from "./bottomPanel/types";
import type { WorkspaceDeck } from "./SignalScanner";

interface BottomPanelProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  onSymbolSelect: (symbol: MarketSymbol) => void;
  candles: Candle[];
  activeIndicators: IndicatorConfig;
  timeframe: string;
  lang: Language;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  onAnalysisResult?: (result: AnalysisRunResponse | null) => void;
  strategyMode?: boolean;
  workspaceDeck?: WorkspaceDeck | null;
  theme?: "dark" | "light";
}

export default function BottomPanel({
  currentSymbol,
  symbolsList,
  onSymbolSelect,
  candles,
  activeIndicators,
  timeframe,
  lang,
  marketStatus,
  analysisResult,
  onAnalysisResult,
  strategyMode = false,
  workspaceDeck = null,
  theme = "dark"
}: BottomPanelProps) {
  const t = useTranslation(lang);
  const [activeTab, setActiveTab] = useState<BottomPanelTab>("ai");
  const [collapsed, setCollapsed] = useState(false);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookItem[]; asks: OrderBookItem[] }>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisServiceFallback, setAnalysisServiceFallback] = useState(false);
  const [quantHealth, setQuantHealth] = useState<QuantHealth | null>(null);
  const [quantModels, setQuantModels] = useState<QuantModelRegistry | null>(null);
  const [backtest, setBacktest] = useState<QuantBacktestReport | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [backtestError, setBacktestError] = useState("");
  const [membershipNotice, setMembershipNotice] = useState<MembershipNotice | null>(null);
  const [featureAccess, setFeatureAccess] = useState<QuantFeatureAccess>(() => buildQuantFeatureAccess(null, false, false, lang));
  const currentSymbolRef = useRef(currentSymbol);
  const tradingSignalsMode = workspaceDeck === 2;
  const matrixMode = workspaceDeck === 3;
  const executionMode = workspaceDeck === 4;
  const reservedMode = workspaceDeck === 5 || workspaceDeck === 6;

  useEffect(() => {
    currentSymbolRef.current = currentSymbol;
  }, [currentSymbol]);

  useEffect(() => {
    if (!strategyMode) return;
    setActiveTab("ai");
    setCollapsed(false);
  }, [strategyMode]);
  useEffect(() => {
    const controller = new AbortController();
    setFeatureAccess((prev) => ({ ...prev, loading: true }));

    loadMembershipSnapshot(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      const nextAccess = buildQuantFeatureAccess(result.snapshot, result.signedIn, false, lang);
      setFeatureAccess(nextAccess);
      if (!nextAccess.quantLab) {
        setMembershipNotice(membershipNoticeForFeature("quant_lab", nextAccess, lang));
      }
    });

    return () => controller.abort();
  }, [lang]);

  useEffect(() => {
    const book = generateOrderBook(currentSymbol.price, currentSymbol.precision);
    const list = generateMarketTrades(currentSymbol.price, currentSymbol.precision, 12);
    setOrderBook(book);
    setTrades(list);
    if (activeTab !== "book" && activeTab !== "trades") return;

    const tickIntervalSec = currentSymbol.type === "crypto" ? 1500 : 3000;
    const interval = window.setInterval(() => {
      const liveSymbol = currentSymbolRef.current;
      setOrderBook(() => {
        const freshPrice = liveSymbol.price + (Math.random() - 0.5) * liveSymbol.price * 0.001;
        return generateOrderBook(freshPrice, liveSymbol.precision);
      });
      setTrades((prev) => [buildTrade(liveSymbol), ...prev.slice(0, 11)]);
    }, tickIntervalSec);

    return () => window.clearInterval(interval);
  }, [currentSymbol.id, currentSymbol.precision, currentSymbol.type, activeTab]);

  useEffect(() => {
    if (!analysisResult) {
      setAiAnalysis("");
      setAnalysisServiceFallback(false);
      setBacktest(null);
      setBacktestError("");
      return;
    }

    setAiAnalysis(formatAnalysisResponse(analysisResult, currentSymbol, timeframe, lang));
    setAnalysisServiceFallback(Boolean(analysisResult.meta?.engine.includes("fallback")));
  }, [analysisResult, currentSymbol, timeframe, lang]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchQuantStatus = async () => {
      try {
        const [healthResponse, modelsResponse] = await Promise.all([
          fetch("/api/quant/health", { signal: controller.signal }),
          hsFetch("/api/quant/models", { signal: controller.signal })
        ]);
        if (healthResponse.ok) {
          setQuantHealth(await healthResponse.json() as QuantHealth);
        }
        if (modelsResponse.ok) {
          setQuantModels(await modelsResponse.json() as QuantModelRegistry);
        } else {
          const notice = await membershipNoticeFromResponse(modelsResponse, "model_registry", lang);
          if (notice) setMembershipNotice(notice);
        }
      } catch {
        if (!controller.signal.aborted) {
          setQuantHealth(null);
          setQuantModels(null);
        }
      }
    };
    fetchQuantStatus();
    return () => controller.abort();
  }, [lang]);

  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const response = await fetch(`/api/news?symbol=${encodeURIComponent(currentSymbol.id)}`);
        if (response.ok) {
          const data = await response.json();
          setNews(data.news);
        }
      } catch (err) {
        console.error("Failed fetching news:", err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, [currentSymbol]);

  const handleRunAiAnalysis = async () => {
    if (!featureAccess.quantLab) {
      setMembershipNotice(membershipNoticeForFeature("quant_lab", featureAccess, lang));
      onAnalysisResult?.(null);
      return;
    }
    if (candles.length === 0) return;
    setAiLoading(true);
    setAiAnalysis("");
    setAnalysisServiceFallback(false);
    setMembershipNotice(null);

    try {
      const payload: AnalysisRunRequest = {
        symbol: currentSymbol.id,
        interval: timeframe,
        candles,
        indicators: buildIndicatorList(activeIndicators)
      };
      const response = await hsFetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await readJsonOrThrow<AnalysisRunResponse & { serviceFallback?: boolean }>(response, "quant_lab", lang);
      setAiAnalysis(formatAnalysisResponse(data, currentSymbol, timeframe, lang));
      setAnalysisServiceFallback(Boolean(data.serviceFallback || data.meta?.engine.includes("fallback")));
      onAnalysisResult?.(data);
    } catch (error) {
      if (error instanceof MembershipGateError) {
        setMembershipNotice(error.notice);
        setAiAnalysis("");
        setAnalysisServiceFallback(false);
        onAnalysisResult?.(null);
        return;
      }
      setAiAnalysis(getAnalysisFallbackText(lang));
      setAnalysisServiceFallback(true);
      onAnalysisResult?.(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRunBacktest = async () => {
    if (!featureAccess.backtest) {
      const notice = membershipNoticeForFeature("backtest", featureAccess, lang);
      setMembershipNotice(notice);
      setBacktestError(notice.message);
      return;
    }
    if (candles.length < 30) return;
    setBacktestLoading(true);
    setBacktestError("");
    setMembershipNotice(null);

    try {
      const response = await hsFetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: currentSymbol.id,
          interval: timeframe,
          candles,
          indicators: buildIndicatorList(activeIndicators),
          source: "msir-prism-web",
          provider: marketStatus?.provider || marketStatus?.source || "browser",
          window: Math.min(120, Math.max(30, Math.floor(candles.length * 0.6))),
          horizon: 1,
          costBps: 5
        })
      });
      setBacktest(await readJsonOrThrow<QuantBacktestReport>(response, "backtest", lang));
    } catch (error) {
      if (error instanceof MembershipGateError) {
        setMembershipNotice(error.notice);
        setBacktestError(error.notice.message);
        return;
      }
      setBacktestError(getBacktestFallbackText(lang));
    } finally {
      setBacktestLoading(false);
    }
  };

  const handleRunRuntimeDiagnostic = async () => {
    if (!featureAccess.runtimeDiagnostic) {
      const notice = membershipNoticeForFeature("runtime_diagnostic", featureAccess, lang);
      setMembershipNotice(notice);
      setBacktestError(notice.message);
      return;
    }
    if (candles.length < 30) return;
    setRuntimeLoading(true);
    setBacktestError("");
    setMembershipNotice(null);

    try {
      const response = await hsFetch("/api/quant/decision/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: currentSymbol.id,
          interval: timeframe,
          candles,
          indicators: buildIndicatorList(activeIndicators),
          source: "msir-prism-web",
          provider: marketStatus?.provider || marketStatus?.source || "browser",
          context: { dgwmRuntime: "diagnostic" }
        })
      });
      const data = await readJsonOrThrow<AnalysisRunResponse>(response, "runtime_diagnostic", lang);
      setAiAnalysis(formatAnalysisResponse(data, currentSymbol, timeframe, lang));
      setAnalysisServiceFallback(false);
      onAnalysisResult?.(data);
    } catch (error) {
      if (error instanceof MembershipGateError) {
        setMembershipNotice(error.notice);
        setBacktestError(error.notice.message);
        return;
      }
      setBacktestError(getRuntimeFallbackText(lang));
    } finally {
      setRuntimeLoading(false);
    }
  };

  const visibleTab: BottomPanelTab = strategyMode ? "ai" : activeTab;
  const expandedStyle = tradingSignalsMode || matrixMode || executionMode || reservedMode
    ? { height: "54vh", minHeight: 420, maxHeight: 620 }
    : strategyMode
      ? { height: "22vh", minHeight: 168, maxHeight: 236 }
      : { height: "24vh", minHeight: 128, maxHeight: 248 };
  const shellTone = tradingSignalsMode || matrixMode || executionMode || reservedMode
    ? theme === "dark"
      ? "border-[#1e3a5f] bg-[#06111f] shadow-[0_-18px_56px_rgba(0,12,14,0.62),inset_0_1px_0_rgba(96,165,250,0.08)]"
      : "border-[#d9e5f0] bg-[#f7fbff] shadow-[0_-16px_44px_rgba(73,102,132,0.18),inset_0_1px_0_rgba(255,255,255,0.82)]"
    : strategyMode
      ? "border-[#1d4d6d] bg-[#000814] shadow-[0_-18px_56px_rgba(0,20,40,0.58),inset_0_1px_0_rgba(54,96,130,0.04)]"
      : "border-[#12324a] bg-[#000814]";

  return (
    <div
      className={`border-t flex flex-col justify-between shrink-0 z-30 transition-[height,min-height,max-height,border-color,background-color,box-shadow] duration-500 ease-out ${shellTone} ${collapsed ? "h-8" : ""}`}
      style={collapsed ? undefined : expandedStyle}
    >
      <BottomPanelTabs
        activeTab={visibleTab}
        collapsed={collapsed}
        marketStatus={marketStatus}
        lang={lang}
        t={t}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setCollapsed(false);
        }}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        strategyMode={strategyMode}
        workspaceDeck={workspaceDeck}
        theme={theme}
      />

      {!collapsed && (
        <div className={`flex-grow overflow-y-auto min-h-0 transition-[padding,background-color] duration-500 ${
          tradingSignalsMode || matrixMode || executionMode || reservedMode
            ? theme === "dark" ? "bg-[#06111f] p-0" : "bg-[#f7fbff] p-0"
            : strategyMode ? "bg-[#000814] p-0" : "bg-[#000814]/80 p-2"
        }`}>
          {visibleTab === "book" && <OrderBookTab orderBook={orderBook} currentSymbol={currentSymbol} />}
          {visibleTab === "trades" && <TradesTab trades={trades} currentSymbol={currentSymbol} />}
          {visibleTab === "news" && <NewsTab news={news} newsLoading={newsLoading} lang={lang} />}
          {visibleTab === "ai" && tradingSignalsMode && (
            <TradingSignalsWorkbench
              currentSymbol={currentSymbol}
              candles={candles}
              marketStatus={marketStatus}
              analysisResult={analysisResult}
              lang={lang}
              theme={theme}
            />
          )}
          {visibleTab === "ai" && matrixMode && (
            <MarketSignalMatrixWorkbench
              currentSymbol={currentSymbol}
              symbolsList={symbolsList}
              marketStatus={marketStatus}
              lang={lang}
              theme={theme}
              onSymbolSelect={onSymbolSelect}
            />
          )}
          {visibleTab === "ai" && executionMode && (
            <ExecutionPortfolioWorkbench
              currentSymbol={currentSymbol}
              symbolsList={symbolsList}
              marketStatus={marketStatus}
              lang={lang}
              theme={theme}
              onSymbolSelect={onSymbolSelect}
            />
          )}
          {visibleTab === "ai" && reservedMode && workspaceDeck !== null && (
            <ReservedBottomWorkbench deck={workspaceDeck} lang={lang} theme={theme} />
          )}
          {visibleTab === "ai" && !tradingSignalsMode && !matrixMode && !executionMode && !reservedMode && (
            <AiAnalysisTab
              currentSymbol={currentSymbol}
              candles={candles}
              marketStatus={marketStatus}
              aiAnalysis={aiAnalysis}
              aiLoading={aiLoading}
              analysisServiceFallback={analysisServiceFallback}
              analysisResult={analysisResult}
              quantHealth={quantHealth}
              quantModels={quantModels}
              backtest={backtest}
              backtestLoading={backtestLoading}
              runtimeLoading={runtimeLoading}
              backtestError={backtestError}
              membershipNotice={membershipNotice}
              featureAccess={featureAccess}
              lang={lang}
              onRunAnalysis={handleRunAiAnalysis}
              onRunBacktest={handleRunBacktest}
              onRunRuntime={handleRunRuntimeDiagnostic}
              strategyMode={strategyMode}
              news={news}
              newsLoading={newsLoading}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReservedBottomWorkbench({ deck, lang, theme }: { deck: WorkspaceDeck; lang: Language; theme: "dark" | "light" }) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const learningMode = deck === 5;
  const label = learningMode ? "V" : "VI";
  const title = learningMode
    ? zh ? "复盘与归因工作台" : "Learning & Attribution Workbench"
    : zh ? "元治理仲裁台" : "Meta-Governance Arbitration Desk";
  const subtitle = learningMode
    ? zh ? "把 IV 的成交结果和 DGWM 的当时判断放在一起，做低频校准。" : "Pair IV fills with DGWM decision snapshots for low-frequency calibration."
    : zh ? "悬在 I-V 之上，只做允许、否决、降级、冻结，不生成交易信号。" : "Sits above I-V; allows, vetoes, degrades, or freezes without generating trade signals.";
  const cards = learningMode
    ? [
        { label: zh ? "执行成交记录" : "Execution Records", value: "IV / PnL", note: zh ? "硬数据入口" : "hard-data input" },
        { label: zh ? "DGWM 决策快照" : "DGWM Snapshots", value: "II-IV", note: zh ? "软证据入口" : "soft-evidence input" },
        { label: zh ? "归因引擎" : "Attribution Engine", value: zh ? "盈亏归因" : "P/L cause", note: zh ? "核心决策层" : "core layer" },
        { label: zh ? "学习回灌" : "Learning Feedback", value: zh ? "每周" : "Weekly", note: "III / IV" }
      ]
    : [
        { label: "Ethan7586", value: zh ? "收敛验证" : "Convergent Check", note: zh ? "风险、敞口、历史可信度" : "risk, exposure, history" },
        { label: "Christine3749", value: zh ? "机会穿透" : "Opportunity Probe", note: zh ? "过度保守、错失机会" : "missed opportunity" },
        { label: zh ? "仲裁决策台" : "Arbitration Desk", value: zh ? "最终否决" : "Final Veto", note: zh ? "系统级闸门" : "system gate" },
        { label: zh ? "接入状态" : "Integration", value: zh ? "暂缓" : "Deferred", note: zh ? "等 V 样本足够" : "wait for V samples" }
      ];
  const lanes = learningMode
    ? [
        zh ? "单笔复盘：这一次为什么赢/输。" : "Trade review: why this one won or lost.",
        zh ? "策略校准：因子权重是否系统性偏差。" : "Strategy calibration: whether factor weights drifted.",
        zh ? "回灌节奏：批量、低频、可审计。" : "Feedback cadence: batched, low-frequency, auditable."
      ]
    : [
        zh ? "平时不插手 I-V 的正常流水线。" : "Does not interrupt the normal I-V pipeline.",
        zh ? "只有冲突、异常、过度自信或过度保守时介入。" : "Intervenes only on conflict, anomaly, overconfidence, or excess conservatism.",
        zh ? "真实双智能体接入先不施工。" : "Real dual-agent integration stays deferred."
      ];
  const flow = learningMode
    ? [zh ? "成交" : "Fills", zh ? "快照" : "Snapshot", zh ? "归因" : "Attribution", zh ? "校准" : "Calibration", zh ? "回灌" : "Feedback"]
    : ["I-V", "Ethan", "Christine", zh ? "仲裁" : "Arbitrate", zh ? "否决/放行" : "Veto/Allow"];

  return (
    <div className={`h-full min-h-[360px] overflow-y-auto px-6 py-5 ${dark ? "bg-[#06111f] text-slate-200" : "bg-[#f7fbff] text-[#102136]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-current/10 pb-4">
        <div className="min-w-0">
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
            <span>{label}</span>
            <span>/</span>
            <span>{learningMode ? zh ? "复盘归因" : "Attribution" : zh ? "元治理" : "Meta-Governance"}</span>
          </div>
          <h3 className="mt-2 text-[18px] font-black">{title}</h3>
          <p className={`mt-1 max-w-3xl text-[12px] leading-relaxed ${dark ? "text-slate-400" : "text-[#607188]"}`}>{subtitle}</p>
        </div>
        <div className={`shrink-0 border px-4 py-3 text-right font-mono ${dark ? "border-blue-300/20 bg-blue-300/8 text-blue-200" : "border-blue-600/20 bg-blue-50 text-blue-800"}`}>
          <div className="text-[22px] font-black">{learningMode ? "LOW FREQ" : "VETO"}</div>
          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">{learningMode ? "batch feedback" : "final gate"}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <section key={card.label} className={`border p-3 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
            <div className={`font-mono text-[9px] font-black uppercase tracking-[0.14em] ${dark ? "text-slate-500" : "text-[#718299]"}`}>{card.label}</div>
            <div className={`mt-2 text-[16px] font-black ${dark ? "text-slate-100" : "text-[#102136]"}`}>{card.value}</div>
            <div className={`mt-1 text-[10px] leading-relaxed ${dark ? "text-slate-500" : "text-[#607188]"}`}>{card.note}</div>
          </section>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className={`border p-4 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[14px] font-black">{learningMode ? zh ? "系统链路" : "System Flow" : zh ? "仲裁链路" : "Arbitration Flow"}</h4>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label} / {learningMode ? "LEARNING" : "GOVERNANCE"}</div>
          </div>
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {flow.map((item, index) => (
              <div key={`${item}-${index}`} className="flex shrink-0 items-center gap-2">
                <div className={`min-w-[92px] border px-3 py-3 text-center font-mono text-[10px] font-black uppercase tracking-[0.12em] ${index === 2 ? dark ? "border-blue-300/35 bg-blue-300/12 text-blue-100" : "border-blue-600/30 bg-blue-50 text-blue-800" : dark ? "border-white/10 bg-[#06101d] text-slate-400" : "border-[#d9e5f0] bg-[#fbfdff] text-[#607188]"}`}>{item}</div>
                {index < flow.length - 1 && <div className={dark ? "text-slate-600" : "text-slate-400"}>→</div>}
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {lanes.map((item, index) => (
              <div key={item} className={`flex items-start gap-3 border px-3 py-2 ${dark ? "border-white/10 bg-[#06101d]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
                <div className={`font-mono text-[10px] font-black ${dark ? "text-blue-200" : "text-blue-700"}`}>0{index + 1}</div>
                <p className={`text-[11px] leading-relaxed ${dark ? "text-slate-300" : "text-[#28384d]"}`}>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`border p-4 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[14px] font-black">{learningMode ? zh ? "当前约束" : "Current Constraints" : zh ? "介入原则" : "Intervention Rules"}</h4>
            <span className={`border px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.12em] ${dark ? "border-amber-300/25 bg-amber-300/10 text-amber-200" : "border-amber-600/25 bg-amber-50 text-amber-800"}`}>{learningMode ? zh ? "非实时" : "not live" : zh ? "不施工" : "defer"}</span>
          </div>
          <div className="mt-4 grid gap-2">
            {(learningMode
              ? [zh ? "不根据一两笔交易改权重。" : "Do not retune weights from one or two trades.", zh ? "归因先区分运气和能力。" : "Attribution separates luck from skill first.", zh ? "回灌必须可追溯。" : "Every feedback write-back must be traceable."]
              : [zh ? "不替代 DGWM 或 Edge Control。" : "Does not replace DGWM or Edge Control.", zh ? "不做日常交易建议。" : "Does not produce routine trading advice.", zh ? "没有足够 V 样本前只保留架构。" : "Architecture only until V has enough samples."]
            ).map((item) => (
              <div key={item} className={`border px-3 py-2 text-[11px] leading-relaxed ${dark ? "border-white/10 bg-[#06101d] text-slate-300" : "border-[#d9e5f0] bg-[#fbfdff] text-[#28384d]"}`}>{item}</div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
function buildQuantFeatureAccess(
  snapshot: HsMembershipSnapshot | null,
  signedIn: boolean,
  loading: boolean,
  lang: Language
): QuantFeatureAccess {
  const active = membershipIsActive(snapshot);
  return {
    signedIn,
    active,
    loading,
    planLabel: membershipPlanLabel(snapshot, signedIn, lang),
    quantLab: hasMembershipFeature(snapshot, "quant_lab"),
    modelRegistry: hasMembershipFeature(snapshot, "model_registry"),
    runtimeDiagnostic: hasMembershipFeature(snapshot, "runtime_diagnostic"),
    backtest: hasMembershipFeature(snapshot, "backtest")
  };
}

function membershipNoticeForFeature(featureKey: string, access: QuantFeatureAccess, lang: Language) {
  const needsLogin = !access.signedIn;
  const needsActivation = access.signedIn && !access.active;
  return membershipNoticeFromPayload({
    error: needsLogin ? "UNAUTHORIZED" : "HS_MEMBERSHIP_REQUIRED",
    code: needsActivation ? "product_not_active" : "feature_forbidden",
    featureKey
  }, needsLogin ? 401 : 403, featureKey, lang) as MembershipNotice;
}
function buildTrade(liveSymbol: MarketSymbol): MarketTrade {
  const isBuy = Math.random() > 0.46;
  const tickVal = liveSymbol.price * (1 + (Math.random() - 0.5) * 0.001);
  const amount = Math.random() * (liveSymbol.price > 1000 ? 0.3 : 15) + 0.01;
  return {
    time: new Date().toTimeString().split(" ")[0],
    price: Number(tickVal.toFixed(liveSymbol.precision)),
    amount: Number(amount.toFixed(liveSymbol.price > 1000 ? 4 : 2)),
    side: isBuy ? "buy" : "sell"
  };
}

class MembershipGateError extends Error {
  notice: MembershipNotice;

  constructor(notice: MembershipNotice) {
    super(notice.message);
    this.notice = notice;
  }
}

async function readJsonOrThrow<T>(response: Response, featureKey: string, lang: Language): Promise<T> {
  const payload = await readJsonPayload(response);
  if (!response.ok) {
    const notice = membershipNoticeFromPayload(payload, response.status, featureKey, lang);
    if (notice) throw new MembershipGateError(notice);
    throw new Error(readPayloadMessage(payload) || `Request failed with ${response.status}`);
  }
  return payload as T;
}

async function membershipNoticeFromResponse(response: Response, featureKey: string, lang: Language) {
  const payload = await readJsonPayload(response);
  return membershipNoticeFromPayload(payload, response.status, featureKey, lang);
}

async function readJsonPayload(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return { message: text };
  }
}

function membershipNoticeFromPayload(payload: Record<string, any>, status: number, fallbackFeatureKey: string, lang: Language): MembershipNotice | null {
  const error = String(payload.error || "");
  const code = String(payload.code || "");
  const featureKey = String(payload.featureKey || fallbackFeatureKey || "quant_lab");
  const isMembershipError = error === "HS_MEMBERSHIP_REQUIRED" || error === "UNAUTHORIZED" || status === 401 || status === 403;
  if (!isMembershipError) return null;

  const zh = lang === "zh" || lang === "tc";
  const feature = featureLabel(featureKey, lang);
  const signedIn = Boolean(readHsAccessToken());
  const needsLogin = error === "UNAUTHORIZED" || status === 401 || code === "missing_bearer_token" || !signedIn;
  const needsActivation = code === "product_not_active";
  const href = needsLogin ? "/login" : "/membership";
  const actionLabel = needsLogin
    ? (zh ? "登录会员" : "Sign in")
    : needsActivation
      ? (zh ? "开通会员" : "Activate")
      : (zh ? "查看方案" : "View plan");
  const title = needsLogin
    ? (zh ? "需要登录 MSIR Prism 会员" : "MSIR Prism sign-in required")
    : needsActivation
      ? (zh ? "需要开通 MSIR Prism 会员" : "MSIR Prism membership required")
      : (zh ? "当前方案未解锁" : "Plan upgrade required");
  const requiredPlan = featureKey === "runtime_diagnostic" || featureKey === "backtest" ? "Quant Pro" : "Free / Quant Pro";
  const message = needsLogin
    ? (zh ? `登录后才能运行 ${feature}。` : `Sign in before running ${feature}.`)
    : needsActivation
      ? (zh ? "当前账号还没有 MSIR Prism 产品权限，请先开通 Free 会员。" : "Activate the Free MSIR Prism plan before using this product.")
      : (zh ? `${feature} 需要 ${requiredPlan} 权限。` : `${feature} requires ${requiredPlan}.`);

  return { featureKey, title, message, actionLabel, href };
}

function readPayloadMessage(payload: Record<string, any>) {
  return String(payload.message || payload.error_description || payload.error || "");
}

function featureLabel(featureKey: string, lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  const labels: Record<string, string> = {
    quant_lab: zh ? "AI 智能分析" : "AI analysis",
    model_registry: zh ? "模型注册表" : "model registry",
    runtime_diagnostic: zh ? "DGWM Runtime" : "DGWM runtime",
    backtest: zh ? "回测能力" : "backtest"
  };
  return labels[featureKey] || featureKey;
}
function getAnalysisFallbackText(lang: Language) {
  if (lang === "zh") {
    return "量化模型接口连接超时。当前使用前端离线保护提示：结构暂按震荡处理，等待突破或回踩确认。";
  }
  if (lang === "tc") {
    return "量化模型接口連接超時。當前使用前端離線保護提示：結構暫按震盪處理，等待突破或回踩確認。";
  }
  return "Quant model interface timeout. Frontend safety fallback: structure is treated as range-bound until breakout or pullback confirmation.";
}

function getBacktestFallbackText(lang: Language) {
  if (lang === "zh") return "回测接口暂不可用，请稍后重试。";
  if (lang === "tc") return "回測接口暫不可用，請稍後重試。";
  return "Backtest endpoint is unavailable. Please retry shortly.";
}

function getRuntimeFallbackText(lang: Language) {
  if (lang === "zh") return "DGWM 真实诊断暂不可用，请确认 FastAPI 和 DGWM .venv 已启动。";
  if (lang === "tc") return "DGWM 真實診斷暫不可用，請確認 FastAPI 和 DGWM .venv 已啟動。";
  return "DGWM runtime diagnostic is unavailable. Check FastAPI and the DGWM .venv.";
}
