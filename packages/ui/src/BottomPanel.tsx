import { useEffect, useState } from "react";
import { AnalysisRunRequest, AnalysisRunResponse, QuantBacktestReport, QuantHealth, QuantModelRegistry } from "../../shared/src/types";
import { hsFetch } from "../../shared/src/hsAuth";
import { loadMembershipSnapshot } from "../../shared/src/membership";
import { useTranslation } from "../../shared/src/translations";
import { BottomPanelShell } from "./bottomPanel/BottomPanelShell";
import { buildQuantFeatureAccess, getAnalysisFallbackText, getBacktestFallbackText, getRuntimeFallbackText, membershipNoticeForFeature, membershipNoticeFromResponse, MembershipGateError, readJsonOrThrow } from "./bottomPanel/bottomPanelAccess";
import { useBottomPanelMarketFeed } from "./bottomPanel/useBottomPanelMarketFeed";
import { useBottomPanelNews } from "./bottomPanel/useBottomPanelNews";
import { buildIndicatorList, formatAnalysisResponse } from "./bottomPanel/analysisFormat";
import type { BottomPanelTab, MembershipNotice, QuantFeatureAccess } from "./bottomPanel/types";
import type { BottomPanelProps } from "./bottomPanel/BottomPanelProps";

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
  theme = "dark",
  layoutTier = "desktop"
}: BottomPanelProps) {
  const t = useTranslation(lang);
  const [activeTab, setActiveTab] = useState<BottomPanelTab>("ai");
  const [collapsed, setCollapsed] = useState(false);
  const { orderBook, trades } = useBottomPanelMarketFeed(currentSymbol, activeTab);
  const { news, newsLoading } = useBottomPanelNews(currentSymbol.id);
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
  const tradingSignalsMode = workspaceDeck === 2;
  const matrixMode = workspaceDeck === 3;
  const executionMode = workspaceDeck === 4;
  const reservedMode = workspaceDeck === 5 || workspaceDeck === 6;

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

  return (
    <BottomPanelShell
      activeTab={activeTab}
      collapsed={collapsed}
      orderBook={orderBook}
      trades={trades}
      news={news}
      newsLoading={newsLoading}
      currentSymbol={currentSymbol}
      symbolsList={symbolsList}
      candles={candles}
      marketStatus={marketStatus}
      analysisResult={analysisResult}
      aiAnalysis={aiAnalysis}
      aiLoading={aiLoading}
      analysisServiceFallback={analysisServiceFallback}
      quantHealth={quantHealth}
      quantModels={quantModels}
      backtest={backtest}
      backtestLoading={backtestLoading}
      runtimeLoading={runtimeLoading}
      backtestError={backtestError}
      membershipNotice={membershipNotice}
      featureAccess={featureAccess}
      lang={lang}
      t={t}
      strategyMode={strategyMode}
      workspaceDeck={workspaceDeck}
      theme={theme}
      tradingSignalsMode={tradingSignalsMode}
      matrixMode={matrixMode}
      executionMode={executionMode}
      reservedMode={reservedMode}
      layoutTier={layoutTier}
      onSelectTab={(tab) => {
        setActiveTab(tab);
        setCollapsed(false);
      }}
      onToggleCollapsed={() => setCollapsed((value) => !value)}
      onSymbolSelect={onSymbolSelect}
      onRunAnalysis={handleRunAiAnalysis}
      onRunBacktest={handleRunBacktest}
      onRunRuntime={handleRunRuntimeDiagnostic}
    />
  );
}
