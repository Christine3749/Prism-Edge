import { useEffect, useRef, useState } from "react";
import {
  AnalysisRunRequest,
  AnalysisRunResponse,
  Candle,
  IndicatorConfig,
  MarketDataStatus,
  MarketSymbol,
  NewsItem,
  OrderBookItem
} from "../../shared/src/types";
import { generateMarketTrades, generateOrderBook, MarketTrade } from "../../shared/src/mockMarketData";
import { Language, useTranslation } from "../../shared/src/translations";
import { AiAnalysisTab } from "./bottomPanel/AiAnalysisTab";
import { BottomPanelTabs } from "./bottomPanel/BottomPanelTabs";
import { NewsTab } from "./bottomPanel/NewsTab";
import { OrderBookTab } from "./bottomPanel/OrderBookTab";
import { TradesTab } from "./bottomPanel/TradesTab";
import { buildIndicatorList, formatAnalysisResponse } from "./bottomPanel/analysisFormat";
import type { BottomPanelTab } from "./bottomPanel/types";

interface BottomPanelProps {
  currentSymbol: MarketSymbol;
  candles: Candle[];
  activeIndicators: IndicatorConfig;
  timeframe: string;
  lang: Language;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  onAnalysisResult?: (result: AnalysisRunResponse | null) => void;
}

export default function BottomPanel({
  currentSymbol,
  candles,
  activeIndicators,
  timeframe,
  lang,
  marketStatus,
  analysisResult,
  onAnalysisResult
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
  const currentSymbolRef = useRef(currentSymbol);

  useEffect(() => {
    currentSymbolRef.current = currentSymbol;
  }, [currentSymbol]);

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
      return;
    }

    setAiAnalysis(formatAnalysisResponse(analysisResult, currentSymbol, timeframe, lang));
    setAnalysisServiceFallback(Boolean(analysisResult.meta?.engine.includes("fallback")));
  }, [analysisResult, currentSymbol, timeframe, lang]);

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
    if (candles.length === 0) return;
    setAiLoading(true);
    setAiAnalysis("");
    setAnalysisServiceFallback(false);

    try {
      const payload: AnalysisRunRequest = {
        symbol: currentSymbol.id,
        interval: timeframe,
        candles,
        indicators: buildIndicatorList(activeIndicators)
      };
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json() as AnalysisRunResponse & { serviceFallback?: boolean };
      setAiAnalysis(formatAnalysisResponse(data, currentSymbol, timeframe, lang));
      setAnalysisServiceFallback(Boolean(data.serviceFallback || data.meta?.engine.includes("fallback")));
      onAnalysisResult?.(data);
    } catch {
      setAiAnalysis(getAnalysisFallbackText(lang));
      setAnalysisServiceFallback(true);
      onAnalysisResult?.(null);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div
      className={`border-t border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0 z-30 transition-all duration-300 ${collapsed ? "h-8" : ""}`}
      style={collapsed ? undefined : { height: "24vh", minHeight: 128, maxHeight: 248 }}
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
      />

      {!collapsed && (
        <div className="flex-grow p-2 overflow-y-auto min-h-0 bg-slate-950/80">
          {activeTab === "book" && <OrderBookTab orderBook={orderBook} currentSymbol={currentSymbol} />}
          {activeTab === "trades" && <TradesTab trades={trades} currentSymbol={currentSymbol} />}
          {activeTab === "news" && <NewsTab news={news} newsLoading={newsLoading} lang={lang} />}
          {activeTab === "ai" && (
            <AiAnalysisTab
              aiAnalysis={aiAnalysis}
              aiLoading={aiLoading}
              analysisServiceFallback={analysisServiceFallback}
              analysisResult={analysisResult}
              lang={lang}
              onRunAnalysis={handleRunAiAnalysis}
            />
          )}
        </div>
      )}
    </div>
  );
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

function getAnalysisFallbackText(lang: Language) {
  if (lang === "zh") {
    return "量化模型接口连接超时。当前使用前端离线保护提示：结构暂按震荡处理，等待突破或回踩确认。";
  }
  if (lang === "tc") {
    return "量化模型接口連接超時。當前使用前端離線保護提示：結構暫按震盪處理，等待突破或回踩確認。";
  }
  return "Quant model interface timeout. Frontend safety fallback: structure is treated as range-bound until breakout or pullback confirmation.";
}
