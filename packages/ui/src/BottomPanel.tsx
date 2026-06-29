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
import { NewsTab } from "./bottomPanel/NewsTab";
import { OrderBookTab } from "./bottomPanel/OrderBookTab";
import { TradesTab } from "./bottomPanel/TradesTab";
import { buildIndicatorList, formatAnalysisResponse } from "./bottomPanel/analysisFormat";
import type { BottomPanelTab, MembershipNotice, QuantFeatureAccess } from "./bottomPanel/types";

interface BottomPanelProps {
  currentSymbol: MarketSymbol;
  candles: Candle[];
  activeIndicators: IndicatorConfig;
  timeframe: string;
  lang: Language;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  onAnalysisResult?: (result: AnalysisRunResponse | null) => void;
  strategyMode?: boolean;
}

export default function BottomPanel({
  currentSymbol,
  candles,
  activeIndicators,
  timeframe,
  lang,
  marketStatus,
  analysisResult,
  onAnalysisResult,
  strategyMode = false
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

  useEffect(() => {
    currentSymbolRef.current = currentSymbol;
  }, [currentSymbol]);
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
          window: Math.min(120, Math.max(30, Math.floor(candles.length * 0.6)))
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

  const expandedStyle = strategyMode
    ? { height: "28vh", minHeight: 172, maxHeight: 312 }
    : { height: "24vh", minHeight: 128, maxHeight: 248 };
  const shellTone = strategyMode
    ? "border-sky-500/25 bg-[#050914] shadow-[0_-18px_56px_rgba(2,8,23,0.48),inset_0_1px_0_rgba(34,211,238,0.08)]"
    : "border-slate-800 bg-slate-950";

  return (
    <div
      className={`border-t flex flex-col justify-between shrink-0 z-30 transition-[height,min-height,max-height,border-color,background-color,box-shadow] duration-500 ease-out ${shellTone} ${collapsed ? "h-8" : ""}`}
      style={collapsed ? undefined : expandedStyle}
    >
      <BottomPanelTabs
        activeTab={activeTab}
        collapsed={collapsed}
        marketStatus={marketStatus}
        t={t}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setCollapsed(false);
        }}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        strategyMode={strategyMode}
      />

      {!collapsed && (
        <div className={`flex-grow overflow-y-auto min-h-0 transition-[padding,background-color] duration-500 ${strategyMode ? "bg-[#050914]/95 p-3" : "bg-slate-950/80 p-2"}`}>
          {activeTab === "book" && <OrderBookTab orderBook={orderBook} currentSymbol={currentSymbol} />}
          {activeTab === "trades" && <TradesTab trades={trades} currentSymbol={currentSymbol} />}
          {activeTab === "news" && <NewsTab news={news} newsLoading={newsLoading} lang={lang} />}
          {activeTab === "ai" && (
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
