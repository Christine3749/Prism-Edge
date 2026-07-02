import { AnalysisOutput, LoadingState, MembershipNoticeBanner } from "./aiAnalysis/AnalysisOutput";
import { StrategyWorkbenchState, TrendWorkbenchState } from "./aiAnalysis/TrendWorkbenchState";
import type { AiAnalysisTabProps } from "./aiAnalysis/types";

export function AiAnalysisTab({
  currentSymbol,
  candles,
  marketStatus,
  aiAnalysis,
  aiLoading,
  analysisServiceFallback,
  analysisResult,
  quantHealth,
  quantModels,
  backtest,
  backtestLoading,
  runtimeLoading,
  backtestError,
  membershipNotice,
  featureAccess,
  lang,
  onRunAnalysis,
  onRunBacktest,
  onRunRuntime,
  strategyMode = false,
  news = [],
  newsLoading = false
}: AiAnalysisTabProps) {
  if (strategyMode && !aiLoading) {
    return (
      <StrategyWorkbenchState
        currentSymbol={currentSymbol}
        candles={candles}
        marketStatus={marketStatus}
        analysisResult={analysisResult}
        featureAccess={featureAccess}
        lang={lang}
        news={news}
        newsLoading={newsLoading}
        onRunAnalysis={onRunAnalysis}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-2">
      {membershipNotice && aiAnalysis && <MembershipNoticeBanner notice={membershipNotice} />}
      <div className="min-h-0 flex-1 flex flex-col justify-between">
        {aiLoading ? (
          <LoadingState lang={lang} />
        ) : aiAnalysis ? (
          <AnalysisOutput
            aiAnalysis={aiAnalysis}
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
            onRunBacktest={onRunBacktest}
            onRunRuntime={onRunRuntime}
          />
        ) : (
          <TrendWorkbenchState
            currentSymbol={currentSymbol}
            candles={candles}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            featureAccess={featureAccess}
            lang={lang}
            news={news}
            newsLoading={newsLoading}
            onRunAnalysis={onRunAnalysis}
            compact={false}
          />
        )}
      </div>
    </div>
  );
}