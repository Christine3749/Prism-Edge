import { useRef } from "react";
import type {
  AnalysisRunResponse,
  AppSettings,
  Candle,
  DrawingBase,
  DrawingTool,
  IndicatorConfig,
  MarketDataStatus,
  MarketSymbol
} from "../../shared/src/types";
import { ChartStatusOverlays } from "./chart/ChartStatusOverlays";
import { ChartWatermark } from "./chart/ChartWatermark";
import { DrawingOverlay } from "./chart/DrawingOverlay";
import { useLightweightChart } from "./chart/useLightweightChart";

interface ChartContainerProps {
  currentSymbol: MarketSymbol;
  candles: Candle[];
  indicatorConfig: IndicatorConfig;
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  drawings: DrawingBase[];
  onUpdateDrawings: (drawings: DrawingBase[]) => void;
  settings: AppSettings;
  currentTimeframe: string;
  chartType: string;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  scannerHandleActive?: boolean;
  onPrimaryInfoHoverChange?: (active: boolean) => void;
}

export default function ChartContainer({
  currentSymbol,
  candles,
  indicatorConfig,
  activeTool,
  onSelectTool,
  drawings,
  onUpdateDrawings,
  settings,
  currentTimeframe,
  chartType,
  marketStatus,
  analysisResult,
  scannerHandleActive = false,
  onPrimaryInfoHoverChange
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<HTMLDivElement>(null);
  const oscillatorChartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isOscActive = indicatorConfig.rsi.active || indicatorConfig.macd.active;
  const { chartInstance, mainSeries } = useLightweightChart({
    containerRef,
    mainChartRef,
    oscillatorChartRef,
    candles,
    indicatorConfig,
    settings,
    chartType,
    isOscActive,
    pricePrecision: currentSymbol.precision
  });

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col relative bg-[#000814] overflow-hidden select-none"
      style={{ minHeight: 180 }}
      ref={containerRef}
      id="chart_canvas_zone"
    >
      <div className="flex-grow min-h-0 relative" ref={mainChartRef}></div>

      <ChartStatusOverlays
        candles={candles}
        currentSymbol={currentSymbol}
        currentTimeframe={currentTimeframe}
        marketStatus={marketStatus}
        dimPrimaryInfo={scannerHandleActive}
        onPrimaryInfoHoverChange={onPrimaryInfoHoverChange}
      />

      <div
        className="w-full shrink-0 relative bg-[#000814] border-t border-[#12324a]"
        ref={oscillatorChartRef}
        style={{
          height: isOscActive ? "30%" : "0px",
          display: isOscActive ? "block" : "none"
        }}
      ></div>

      <ChartWatermark />

      <DrawingOverlay
        svgRef={svgRef}
        containerRef={containerRef}
        chartInstance={chartInstance}
        mainSeries={mainSeries}
        activeTool={activeTool}
        onSelectTool={onSelectTool}
        drawings={drawings}
        onUpdateDrawings={onUpdateDrawings}
        currentSymbol={currentSymbol}
        analysisResult={analysisResult}
        overlayHeight={isOscActive ? "70%" : "100%"}
      />

      <div className="absolute right-3 top-3 text-[9px] font-mono text-slate-500 bg-[#000814]/78 px-2 py-0.5 rounded border border-[#12324a]/70 select-none z-20 uppercase tracking-widest hidden xl:block">
        Focus: {currentSymbol.id} • {currentTimeframe}
      </div>
    </div>
  );
}
