import { useCallback, useState } from "react";
import type { RefObject } from "react";
import type { UTCTimestamp } from "lightweight-charts";
import type {
  AnalysisRunResponse,
  DrawingBase,
  DrawingPoint,
  DrawingTool,
  MarketSymbol
} from "../../../shared/src/types";
import { renderAnalysisItems } from "./renderAnalysisItems";
import { renderCurrentDrawing, renderStoredDrawing } from "./renderDrawingItems";

interface DrawingOverlayProps {
  svgRef: RefObject<SVGSVGElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  chartInstance: any;
  mainSeries: any;
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  drawings: DrawingBase[];
  onUpdateDrawings: (drawings: DrawingBase[]) => void;
  currentSymbol: MarketSymbol;
  analysisResult?: AnalysisRunResponse | null;
  overlayHeight: string;
}

export function DrawingOverlay({
  svgRef,
  containerRef,
  chartInstance,
  mainSeries,
  activeTool,
  onSelectTool,
  drawings,
  onUpdateDrawings,
  currentSymbol,
  analysisResult,
  overlayHeight
}: DrawingOverlayProps) {
  const [currentDrawing, setCurrentDrawing] = useState<DrawingBase | null>(null);

  const getCoordinates = useCallback((pt: DrawingPoint) => {
    if (!chartInstance || !mainSeries) return null;
    const x = chartInstance.timeScale().timeToCoordinate(pt.time as UTCTimestamp);
    const y = mainSeries.priceToCoordinate(pt.price);
    if (x === null || y === null) return null;
    return { x, y };
  }, [chartInstance, mainSeries]);

  const getCoordinatesFromPixels = useCallback((x: number, y: number) => {
    if (!chartInstance || !mainSeries || !svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    const time = chartInstance.timeScale().coordinateToTime(relativeX);
    const price = mainSeries.coordinateToPrice(relativeY);
    if (time === null || price === null) return null;
    return { time: Number(time), price };
  }, [chartInstance, mainSeries, svgRef]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === "cursor" || !chartInstance || !mainSeries) return;
    const anchors = getCoordinatesFromPixels(e.clientX, e.clientY);
    if (!anchors) return;

    const id = Math.random().toString(36).substring(7);
    if (activeTool === "horizalline") {
      onUpdateDrawings([...drawings, {
        id,
        type: "horizalline",
        color: "#fbbf24",
        strokeWidth: 2,
        points: [anchors],
        isCompleted: true
      }]);
      onSelectTool("cursor");
      return;
    }

    setCurrentDrawing({
      id,
      type: activeTool,
      color: "#22d3ee",
      strokeWidth: 2,
      points: [anchors, anchors],
      isCompleted: false
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentDrawing || !chartInstance || !mainSeries) return;
    const anchors = getCoordinatesFromPixels(e.clientX, e.clientY);
    if (!anchors) return;
    setCurrentDrawing({ ...currentDrawing, points: [currentDrawing.points[0], anchors] });
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentDrawing) return;
    const anchors = getCoordinatesFromPixels(e.clientX, e.clientY);

    if (anchors) {
      if (currentDrawing.type === "text") {
        const userLabel = prompt("Enter text markup details:", "Note mark");
        if (userLabel) {
          onUpdateDrawings([...drawings, {
            ...currentDrawing,
            text: userLabel,
            points: [currentDrawing.points[0]],
            isCompleted: true
          }]);
        }
      } else {
        onUpdateDrawings([...drawings, {
          ...currentDrawing,
          points: [currentDrawing.points[0], anchors],
          isCompleted: true
        }]);
      }
    }

    setCurrentDrawing(null);
    onSelectTool("cursor");
  };

  return (
    <svg
      ref={svgRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="absolute inset-x-0 top-0 w-full cursor-crosshair z-25 pointer-events-auto"
      style={{
        height: overlayHeight,
        overflow: "visible",
        cursor: activeTool === "cursor" ? "default" : "crosshair",
        pointerEvents: activeTool === "cursor" ? "none" : "auto"
      }}
    >
      {drawings.map((draw) => renderStoredDrawing(draw, getCoordinates, currentSymbol.precision))}
      {renderAnalysisItems({
        analysisResult,
        currentSymbol,
        containerWidth: containerRef.current?.clientWidth || 0,
        getCoordinates,
        mainSeries
      })}
      {renderCurrentDrawing(currentDrawing, getCoordinates)}
    </svg>
  );
}
