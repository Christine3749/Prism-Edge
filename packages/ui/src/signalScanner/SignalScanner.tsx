import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { NewsItem } from "@shared/types";
import { SingleAssetWarRoom } from "./SingleAssetWarRoom";
import { TradingSignalsWarRoom } from "./TradingSignalsWarRoom";
import {
  buildIntelEvents,
  buildIntelStats,
  buildStrategyLens,
  buildStrategySuggestions
} from "./intelBuilders";
import type { SignalScannerProps } from "./types";

export default function SignalScanner({
  currentSymbol,
  symbolsList,
  marketStatus,
  analysisResult,
  lang,
  onSymbolSelect,
  onHandleHoverChange,
  onExpandedChange,
  activeWorkspaceDeck = null,
  integratedBottom = false,
  revealHandle = false
}: SignalScannerProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const labels = getLabels(lang);

  useEffect(() => {
    setCollapsed(activeWorkspaceDeck === null);
  }, [activeWorkspaceDeck]);

  useEffect(() => {
    onExpandedChange?.(!collapsed);
  }, [collapsed, onExpandedChange]);

  useEffect(() => {
    const controller = new AbortController();
    setNewsLoading(true);
    fetch(`/api/news?symbol=${encodeURIComponent(currentSymbol.id)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ news: NewsItem[] }> : Promise.reject(new Error("News request failed")))
      .then((data) => {
        if (!controller.signal.aborted) setNewsItems(data.news.slice(0, 4));
      })
      .catch(() => {
        if (!controller.signal.aborted) setNewsItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setNewsLoading(false);
      });
    return () => controller.abort();
  }, [currentSymbol.id]);

  const events = useMemo(
    () => buildIntelEvents(symbolsList, currentSymbol, marketStatus, analysisResult, lang),
    [symbolsList, currentSymbol, marketStatus, analysisResult, lang]
  );
  const stats = useMemo(
    () => buildIntelStats(symbolsList, currentSymbol, marketStatus, analysisResult),
    [symbolsList, currentSymbol, marketStatus, analysisResult]
  );
  const strategy = useMemo(
    () => buildStrategyLens(currentSymbol, marketStatus, analysisResult, lang),
    [currentSymbol, marketStatus, analysisResult, lang]
  );
  const suggestions = useMemo(
    () => buildStrategySuggestions(currentSymbol, marketStatus, analysisResult, newsItems, lang),
    [currentSymbol, marketStatus, analysisResult, newsItems, lang]
  );
  const handleRevealTone = revealHandle || !collapsed
    ? "border-blue-500/30 bg-[#031426] text-blue-200/75 opacity-100 shadow-[0_0_34px_rgba(54,96,130,0.28)]"
    : "border-blue-500/30 bg-[#000814]/35 text-blue-300/70 opacity-25 shadow-none";
  const workspaceWidth = "clamp(900px, 46vw, 1180px)";
  const resolvedDeck = activeWorkspaceDeck ?? (collapsed ? null : 1);
  const showTradingSignalsDeck = resolvedDeck === 2;

  return (
    <aside
      className="relative z-[70] hidden h-full shrink-0 overflow-visible xl:block"
      data-workspace-deck={resolvedDeck === null ? "none" : resolvedDeck === 1 ? "I" : "II"}
      style={{
        width: collapsed ? 0 : workspaceWidth,
        transition: "width 520ms cubic-bezier(0.22, 1, 0.36, 1)"
      }}
    >
      <div
        className={`absolute inset-y-0 left-0 flex flex-col border-r border-[#12324a]/80 bg-[#000814] text-slate-200 shadow-[18px_0_44px_rgba(0,18,38,0.42)] transition-[transform,opacity,filter] duration-500 ${
          collapsed ? "pointer-events-none -translate-x-5 opacity-0 blur-[1px]" : "translate-x-0 opacity-100 blur-0"
        }`}
        style={{ width: workspaceWidth, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {showTradingSignalsDeck ? (
          <TradingSignalsWarRoom
            currentSymbol={currentSymbol}
            strategy={strategy}
            events={events}
            stats={stats}
            suggestions={suggestions}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            lang={lang}
          />
        ) : (
          <SingleAssetWarRoom
            currentSymbol={currentSymbol}
            events={events}
            stats={stats}
            suggestions={suggestions}
            newsItems={newsItems}
            newsLoading={newsLoading}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            lang={lang}
            integratedBottom={false}
            onSymbolSelect={onSymbolSelect}
          />
        )}
      </div>

      <button
        type="button"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setCollapsed((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setCollapsed((value) => !value);
        }}
        onPointerEnter={() => onHandleHoverChange?.(true)}
        onPointerLeave={() => onHandleHoverChange?.(false)}
        onMouseEnter={() => onHandleHoverChange?.(true)}
        onMouseLeave={() => onHandleHoverChange?.(false)}
        onFocus={() => onHandleHoverChange?.(true)}
        onBlur={() => onHandleHoverChange?.(false)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? labels.expand : labels.collapse}
        className="pointer-events-auto absolute top-[2.75rem] z-[80] flex h-12 w-12 cursor-pointer items-center justify-center bg-transparent p-0 focus:outline-none"
        title={collapsed ? labels.expand : labels.collapse}
        style={{ left: collapsed ? 8 : `calc(${workspaceWidth} + 2px)` }}
      >
        <span
          className={`flex h-9 w-7 items-center justify-center rounded-md border backdrop-blur transition-[opacity,color,border-color,background-color,box-shadow,transform] delay-[80ms] duration-200 ${handleRevealTone}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-500 ${collapsed ? "rotate-0" : "rotate-180"}`}
            style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </span>
      </button>
    </aside>
  );
}

function getLabels(lang: SignalScannerProps["lang"]) {
  const zh = lang === "zh" || lang === "tc";
  return {
    collapse: zh ? "收起策略专栏" : "Collapse strategy column",
    expand: zh ? "展开策略专栏" : "Expand strategy column"
  };
}
