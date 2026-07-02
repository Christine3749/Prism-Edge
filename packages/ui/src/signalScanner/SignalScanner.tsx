import { useEffect, useMemo, useState } from "react";
import type { NewsItem } from "@shared/types";
import { ExecutionControlSummary } from "./ExecutionControlSummary";
import { MatrixModeSummary } from "./MatrixModeSummary";
import { SingleAssetWarRoom } from "./SingleAssetWarRoom";
import {
  buildIntelEvents,
  buildIntelStats,
  buildStrategyLens,
  buildStrategySuggestions
} from "./intelBuilders";
import { ReservedWorkspaceSummary } from "./ReservedWorkspaceSummary";
import { SignalModeSummary } from "./SignalModeSummary";
import { workspaceDeckLabel } from "./workspaceDeckLabel";
import type { SignalScannerProps } from "./types";

export default function SignalScanner({
  currentSymbol,
  symbolsList,
  marketStatus,
  analysisResult,
  lang,
  onSymbolSelect,
  activeWorkspaceDeck = null,
  integratedBottom = false,
  theme = "dark"
}: SignalScannerProps) {
  const collapsed = activeWorkspaceDeck === null;
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const signalMode = activeWorkspaceDeck === 2;
  const matrixMode = activeWorkspaceDeck === 3;
  const executionMode = activeWorkspaceDeck === 4;
  const reservedMode = activeWorkspaceDeck === 5 || activeWorkspaceDeck === 6;
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
  const workspaceWidth = signalMode || matrixMode || executionMode || reservedMode ? "clamp(258px, 19vw, 336px)" : "clamp(900px, 46vw, 1180px)";
  const resolvedDeck = activeWorkspaceDeck;

  return (
    <aside
      className="relative z-[70] hidden h-full shrink-0 overflow-visible xl:block"
      data-workspace-deck={resolvedDeck === null ? "none" : workspaceDeckLabel(resolvedDeck)}
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
        {signalMode ? (
          <SignalModeSummary
            currentSymbol={currentSymbol}
            strategy={strategy}
            stats={stats}
            suggestions={suggestions}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            lang={lang}
            theme={theme}
          />
        ) : matrixMode ? (
          <MatrixModeSummary
            currentSymbol={currentSymbol}
            symbolsList={symbolsList}
            marketStatus={marketStatus}
            lang={lang}
            theme={theme}
          />
        ) : executionMode ? (
          <ExecutionControlSummary
            currentSymbol={currentSymbol}
            symbolsList={symbolsList}
            marketStatus={marketStatus}
            lang={lang}
            theme={theme}
          />
        ) : reservedMode && activeWorkspaceDeck !== null ? (
          <ReservedWorkspaceSummary deck={activeWorkspaceDeck} lang={lang} theme={theme} />
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

    </aside>
  );
}
