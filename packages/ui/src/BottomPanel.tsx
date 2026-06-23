import React, { useState, useEffect } from "react";
import { 
  Layers, MessageSquare, TrendingUp, Sparkles, BookOpen, AlertTriangle, Play, ChevronDown, ChevronUp
} from "lucide-react";
import {
  AnalysisIndicator,
  AnalysisRunRequest,
  AnalysisRunResponse,
  MarketSymbol,
  Candle,
  OrderBookItem,
  NewsItem
} from "../../shared/src/types";
import { generateOrderBook, generateMarketTrades, MarketTrade } from "../../shared/src/mockMarketData";
import { Language, useTranslation } from "../../shared/src/translations";

interface BottomPanelProps {
  currentSymbol: MarketSymbol;
  candles: Candle[];
  activeIndicators: any;
  timeframe: string;
  lang: Language;
}

export default function BottomPanel({
  currentSymbol,
  candles,
  activeIndicators,
  timeframe,
  lang
}: BottomPanelProps) {
  const t = useTranslation(lang);
  const [activeTab, setActiveTab] = useState<"book" | "trades" | "news" | "ai">("book");
  const [collapsed, setCollapsed] = useState(false);
  
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookItem[]; asks: OrderBookItem[] }>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisServiceFallback, setAnalysisServiceFallback] = useState(false);
  const bookGridTemplate: React.CSSProperties = {
    gridTemplateColumns: "minmax(7.5rem, 1fr) minmax(5rem, 0.7fr) minmax(5.5rem, 0.7fr)",
    columnGap: "0.75rem"
  };

  useEffect(() => {
    const book = generateOrderBook(currentSymbol.price, currentSymbol.precision);
    const list = generateMarketTrades(currentSymbol.price, currentSymbol.precision, 12);
    setOrderBook(book);
    setTrades(list);

    const isCrypto = currentSymbol.type === "crypto";
    const tickIntervalSec = isCrypto ? 1500 : 3000;

    const interval = setInterval(() => {
      setOrderBook((prev) => {
        const noise = (Math.random() - 0.5) * currentSymbol.price * 0.001;
        const freshPrice = currentSymbol.price + noise;
        return generateOrderBook(freshPrice, currentSymbol.precision);
      });

      setTrades((prev) => {
        const isBuy = Math.random() > 0.46;
        const tickVal = currentSymbol.price * (1 + (Math.random() - 0.5) * 0.001);
        const amount = Math.random() * (currentSymbol.price > 1000 ? 0.3 : 15) + 0.01;
        const timeStr = new Date().toTimeString().split(" ")[0];
        
        const nextTrade: MarketTrade = {
          time: timeStr,
          price: Number(tickVal.toFixed(currentSymbol.precision)),
          amount: Number(amount.toFixed(currentSymbol.price > 1000 ? 4 : 2)),
          side: isBuy ? "buy" : "sell"
        };
        return [nextTrade, ...prev.slice(0, 11)];
      });
    }, tickIntervalSec);

    return () => clearInterval(interval);
  }, [currentSymbol]);

  const buildIndicatorList = (): AnalysisIndicator[] => {
    const enabled: AnalysisIndicator[] = [];
    if (activeIndicators?.sma?.active) enabled.push("SMA");
    if (activeIndicators?.ema?.active) enabled.push("EMA");
    if (activeIndicators?.rsi?.active) enabled.push("RSI");
    if (activeIndicators?.macd?.active) enabled.push("MACD");
    if (activeIndicators?.bollinger?.active) enabled.push("BOLLINGER");
    return enabled;
  };

  const formatAnalysisResponse = (data: AnalysisRunResponse) => {
    const trendLabel = {
      bullish: lang === "zh" ? "偏多" : lang === "tc" ? "偏多" : "Bullish",
      bearish: lang === "zh" ? "偏空" : lang === "tc" ? "偏空" : "Bearish",
      neutral: lang === "zh" ? "中性" : lang === "tc" ? "中性" : "Neutral"
    }[data.trend];

    const confidence = `${Math.round(data.confidence * 100)}%`;
    const support = data.levels.support.length > 0 ? data.levels.support.join(", ") : "-";
    const resistance = data.levels.resistance.length > 0 ? data.levels.resistance.join(", ") : "-";
    const signals = data.signals.length > 0
      ? data.signals.map((signal) => `${signal.type.toUpperCase()} @ ${signal.price} · ${signal.label}`).join("\n")
      : (lang === "zh" ? "暂无明确触发信号" : lang === "tc" ? "暫無明確觸發信號" : "No active trigger signal");

    return [
      `# ${currentSymbol.id} ${timeframe} ${lang === "zh" ? "量化分析" : lang === "tc" ? "量化分析" : "Quant Analysis"}`,
      `- ${lang === "zh" ? "趋势" : lang === "tc" ? "趨勢" : "Trend"}: **${trendLabel}**`,
      `- ${lang === "zh" ? "置信度" : lang === "tc" ? "置信度" : "Confidence"}: **${confidence}**`,
      `- ${lang === "zh" ? "支撑" : lang === "tc" ? "支撐" : "Support"}: ${support}`,
      `- ${lang === "zh" ? "压力" : lang === "tc" ? "壓力" : "Resistance"}: ${resistance}`,
      `## ${lang === "zh" ? "信号" : lang === "tc" ? "信號" : "Signals"}`,
      signals,
      `## ${lang === "zh" ? "摘要" : lang === "tc" ? "摘要" : "Summary"}`,
      data.summary
    ].join("\n");
  };

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
        indicators: buildIndicatorList()
      };

      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json() as AnalysisRunResponse & { serviceFallback?: boolean };
        setAiAnalysis(formatAnalysisResponse(data));
        setAnalysisServiceFallback(Boolean(data.serviceFallback || data.meta?.engine.includes("fallback")));
      } else {
        throw new Error("Analysis failed");
      }
    } catch (err) {
      setAiAnalysis(lang === "zh"
        ? "量化模型接口连接超时。当前使用前端离线保护提示：结构暂按震荡处理，等待突破或回踩确认。"
        : lang === "tc"
          ? "量化模型接口連接超時。當前使用前端離線保護提示：結構暫按震盪處理，等待突破或回踩確認。"
          : "Quant model interface timeout. Frontend safety fallback: structure is treated as range-bound until breakout or pullback confirmation.");
      setAnalysisServiceFallback(true);
    } finally {
      setAiLoading(false);
    }
  };

  const formatAiOutput = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div className="space-y-2 text-slate-300 leading-relaxed max-w-4xl text-xs font-sans">
        {lines.map((line, i) => {
          let trimmed = line.trim();
          if (trimmed.startsWith("###") || trimmed.startsWith("##")) {
            const cleanHeader = trimmed.replace(/^###?\s*/, "");
            return (
              <h4 key={i} className="text-cyan-400 font-bold text-xs tracking-tight pt-2 border-b border-slate-800 pb-0.5 uppercase">
                {cleanHeader}
              </h4>
            );
          }
          if (trimmed.startsWith("#")) {
            const cleanHeader = trimmed.replace(/^#\s*/, "");
            return (
              <h3 key={i} className="text-white font-black text-sm tracking-tight pt-3">
                {cleanHeader}
              </h3>
            );
          }

          let renderedContent = trimmed;
          const boldRegex = /\*\*(.*?)\*\*/g;
          const parts = [];
          let lastIndex = 0;
          let match;

          while ((match = boldRegex.exec(trimmed)) !== null) {
            if (match.index > lastIndex) {
              parts.push(trimmed.substring(lastIndex, match.index));
            }
            parts.push(<strong key={match.index} className="text-white font-extrabold">{match[1]}</strong>);
            lastIndex = boldRegex.lastIndex;
          }
          if (lastIndex < trimmed.length) {
            parts.push(trimmed.substring(lastIndex));
          }

          const outputContent = parts.length > 0 ? parts : renderedContent;

          if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
            return (
              <div key={i} className="flex gap-2 items-start pl-2">
                <span className="text-cyan-500 mt-0.5 select-none">•</span>
                <span className="flex-grow">{parts.length > 0 ? outputContent : trimmed.replace(/^[-•*]\s*/, "")}</span>
              </div>
            );
          }

          return <p key={i} className="text-slate-300 pl-1">{outputContent}</p>;
        })}
      </div>
    );
  };

  return (
    <div
      className={`border-t border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0 z-30 transition-all duration-300 ${collapsed ? "h-9" : ""}`}
      style={collapsed ? undefined : { height: "28vh", minHeight: 144, maxHeight: 288 }}
    >
      
      {/* 1. Controller tabs */}
      <div className="px-2 sm:px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between h-10 select-none shrink-0 gap-2">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveTab("book");
              setCollapsed(false);
            }}
            className={`h-9 px-2.5 text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all outline-none border-b-2 hover:text-white cursor-pointer ${
              activeTab === "book" && !collapsed
                ? "border-cyan-500 text-white bg-slate-950/40"
                : "border-transparent text-slate-500"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span>{t("orderBook")}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("trades");
              setCollapsed(false);
            }}
            className={`h-9 px-2.5 text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all outline-none border-b-2 hover:text-white cursor-pointer ${
              activeTab === "trades" && !collapsed
                ? "border-cyan-500 text-white bg-slate-950/40"
                : "border-transparent text-slate-500"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
            <span>{t("recentTrades")}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("news");
              setCollapsed(false);
            }}
            className={`h-9 px-2.5 text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all outline-none border-b-2 hover:text-white cursor-pointer ${
              activeTab === "news" && !collapsed
                ? "border-cyan-500 text-white bg-slate-950/40"
                : "border-transparent text-slate-500"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
            <span>{t("marketNews")}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("ai");
              setCollapsed(false);
            }}
            className={`h-9 px-2.5 text-[11px] font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-all outline-none border-b-2 hover:text-white cursor-pointer ${
              activeTab === "ai" && !collapsed
                ? "border-cyan-500 text-white bg-cyan-950/10"
                : "border-transparent text-slate-400"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-400">{t("aiAnalysis")}</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-500 hidden lg:block">
            Prism Console
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-all self-center"
            title={collapsed ? "Expand panel" : "Collapse panel"}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 2. Body display, hidden when collapsed */}
      {!collapsed && (
        <div className="flex-grow p-2.5 sm:p-3 overflow-y-auto min-h-0 bg-slate-950/80">
          
          {/* Tab 1: Order Book */}
          {activeTab === "book" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-6 h-full text-[11px] font-mono select-none">
              {/* direct asks */}
              <div className="flex flex-col">
                <div className="grid text-slate-500 border-b border-slate-900 pb-1 font-bold text-[9px] uppercase" style={bookGridTemplate}>
                  <span className="text-left text-rose-400">Ask price</span>
                  <span className="text-right">Quantity</span>
                  <span className="text-right hidden sm:inline">Total sum</span>
                </div>
                <div className="flex-grow overflow-y-auto space-y-0.5 pt-0.5 max-h-40 sm:max-h-none">
                  {orderBook.asks.slice().reverse().map((ask, i) => {
                    const percent = Math.min((ask.total / orderBook.asks[orderBook.asks.length - 1].total) * 100, 100);
                    return (
                      <div key={i} className="grid relative hover:bg-rose-950/10 py-0.5 pr-1" style={bookGridTemplate}>
                        <div className="absolute right-0 top-0 bottom-0 bg-rose-500/5 -z-10 transition-all pointer-events-none" style={{ width: `${percent}%` }}></div>
                        <span className="text-left text-rose-400 font-extrabold pl-1">{ask.price.toLocaleString(undefined, { minimumFractionDigits: currentSymbol.precision })}</span>
                        <span className="text-right text-slate-300">{ask.amount}</span>
                        <span className="text-right text-slate-500 hidden sm:inline">{ask.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* direct bids */}
              <div className="flex flex-col">
                <div className="grid text-slate-500 border-b border-slate-900 pb-1 font-bold text-[9px] uppercase" style={bookGridTemplate}>
                  <span className="text-left text-teal-400">Bid price</span>
                  <span className="text-right">Quantity</span>
                  <span className="text-right hidden sm:inline">Total sum</span>
                </div>
                <div className="flex-grow overflow-y-auto space-y-0.5 pt-0.5 max-h-40 sm:max-h-none">
                  {orderBook.bids.map((bid, i) => {
                    const percent = Math.min((bid.total / orderBook.bids[orderBook.bids.length - 1].total) * 100, 100);
                    return (
                      <div key={i} className="grid relative hover:bg-teal-950/10 py-0.5 pr-1" style={bookGridTemplate}>
                        <div className="absolute right-0 top-0 bottom-0 bg-teal-500/5 -z-10 transition-all pointer-events-none" style={{ width: `${percent}%` }}></div>
                        <span className="text-left text-teal-400 font-extrabold pl-1">{bid.price.toLocaleString(undefined, { minimumFractionDigits: currentSymbol.precision })}</span>
                        <span className="text-right text-slate-300">{bid.amount}</span>
                        <span className="text-right text-slate-500 hidden sm:inline">{bid.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Recent trades */}
          {activeTab === "trades" && (
            <div className="h-full overflow-y-auto text-[11px] font-mono max-h-44 sm:max-h-none">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-[9px] font-bold uppercase border-b border-slate-900 pb-1">
                    <th className="py-1">Timestamp</th>
                    <th className="py-1">Action</th>
                    <th className="py-1 text-right">Price ({currentSymbol.id.split("/")[1] || "USD"})</th>
                    <th className="py-1 text-right text-ellipsis overflow-hidden">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40">
                  {trades.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="py-1 text-slate-500">{t.time}</td>
                      <td className="py-1">
                        <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] uppercase tracking-wider ${
                          t.side === "buy" ? "bg-teal-500/10 text-teal-400" : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {t.side}
                        </span>
                      </td>
                      <td className={`py-1 text-right font-bold ${t.side === "buy" ? "text-teal-400" : "text-rose-400"}`}>
                        {t.price.toLocaleString(undefined, { minimumFractionDigits: currentSymbol.precision })}
                      </td>
                      <td className="py-1 text-right text-slate-300">{t.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: news */}
          {activeTab === "news" && (
            <div className="h-full">
              {newsLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500 gap-1.5">
                  <span className="h-4 w-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></span>
                  <span>{lang === "zh" ? "正在连接安全市场数据源..." : lang === "tc" ? "正在連接安全市場數據源..." : "Connecting to secure market feeds..."}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-44 sm:max-h-none overflow-y-auto pr-1">
                  {news.map((item) => {
                    const isBullish = item.sentiment === "bullish";
                    const isBearish = item.sentiment === "bearish";
                    return (
                      <div key={item.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5 hover:border-slate-700 transition-all flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="text-slate-500 font-semibold">{item.source} • {item.time}</span>
                            <span className={`px-1.5 py-0.2 rounded uppercase font-mono text-[8px] font-bold ${
                              isBullish ? "bg-teal-500/10 text-teal-400" : isBearish ? "bg-rose-500/10 text-rose-400" : "bg-slate-500/10 text-slate-400"
                            }`}>
                              {item.sentiment}
                            </span>
                          </div>
                          <h4 className="text-slate-100 font-bold text-xs tracking-tight line-clamp-1 hover:text-white leading-normal">
                            {item.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                            {item.summary}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: AI Analysis */}
          {activeTab === "ai" && (
            <div className="h-full flex flex-col justify-between">
              {aiLoading ? (
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
              ) : aiAnalysis ? (
                <div className="space-y-2 max-h-44 sm:max-h-none overflow-y-auto pr-1">
                  {analysisServiceFallback && (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-300 text-[10px] leading-relaxed">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                      <span>{lang === "zh" ? "后端模型服务未连接或不可用，当前显示棱镜本地模拟接口输出。" : lang === "tc" ? "後端模型服務未連接或不可用，當前顯示稜鏡本地模擬接口輸出。" : "Backend model service is unavailable. Local Prism-Edge simulator output is shown."}</span>
                    </div>
                  )}
                  <div className="bg-slate-900 p-3 border border-slate-800 rounded-lg">
                    {formatAiOutput(aiAnalysis)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-grow py-4 text-center">
                  <div className="h-8 w-8 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-2">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">{lang === "zh" ? "棱镜 AI 智能助理" : lang === "tc" ? "稜鏡 AI 智能助理" : "Prism AI Agent Assistant"}</h4>
                  <p className="text-[10px] text-slate-500 max-w-sm leading-relaxed mb-3">
                    {lang === "zh" ? "根据当前的 K 线视图与技术指标生成实时的量化技术研究与多空对称性分析。" : lang === "tc" ? "根據當前的 K 線視圖與技術指標生成實時的量化技術研究與多空對稱性分析。" : "Obtain a custom generated real-time quant analysis based on the current timeframe candle viewport."}
                  </p>
                  <button
                    onClick={handleRunAiAnalysis}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[10px] rounded-md transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Play className="h-3 w-3 fill-slate-950 stroke-none" />
                    <span>{lang === "zh" ? "运行量化智能诊断" : lang === "tc" ? "運行量化智能診斷" : "Run Technical Study"}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
