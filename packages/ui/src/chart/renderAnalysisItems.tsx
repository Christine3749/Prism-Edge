import type { AnalysisRunResponse, MarketSymbol } from "../../../shared/src/types";
import type { CoordinateResolver } from "./drawingTypes";

interface RenderAnalysisParams {
  analysisResult?: AnalysisRunResponse | null;
  currentSymbol: MarketSymbol;
  containerWidth: number;
  getCoordinates: CoordinateResolver;
  mainSeries: any;
}

export function renderAnalysisItems({
  analysisResult,
  currentSymbol,
  containerWidth,
  getCoordinates,
  mainSeries
}: RenderAnalysisParams) {
  if (!analysisResult) return null;
  return (
    <>
      {analysisResult.levels.support.map((level, index) => renderLevel("support", level, index, currentSymbol.precision, mainSeries))}
      {analysisResult.levels.resistance.map((level, index) => renderLevel("resistance", level, index, currentSymbol.precision, mainSeries))}
      {analysisResult.signals.map((signal, index) => {
        const coord = getCoordinates({ time: signal.time, price: signal.price });
        if (!coord) return null;
        const isBuy = signal.type === "buy";
        const isSell = signal.type === "sell";
        const color = isBuy ? "#22c55e" : isSell ? "#f43f5e" : "#f59e0b";
        const label = isBuy ? "BUY" : isSell ? "SELL" : "WATCH";
        const labelWidth = label.length * 7 + 10;
        const shouldFlipLabel = coord.x > (containerWidth - labelWidth - 36);
        const labelX = shouldFlipLabel ? coord.x - labelWidth - 8 : coord.x + 8;
        const textX = shouldFlipLabel ? labelX + 5 : coord.x + 13;

        return (
          <g key={`signal-${signal.time}-${index}`}>
            <circle cx={coord.x} cy={coord.y} r="6" fill="#020617" stroke={color} strokeWidth="2" />
            <path
              d={isSell
                ? `M ${coord.x - 4} ${coord.y - 1} L ${coord.x} ${coord.y + 4} L ${coord.x + 4} ${coord.y - 1}`
                : `M ${coord.x - 4} ${coord.y + 1} L ${coord.x} ${coord.y - 4} L ${coord.x + 4} ${coord.y + 1}`}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x={labelX} y={coord.y - 11} width={labelWidth} height="18" rx="4" fill="#020617" stroke={color} strokeWidth="1" opacity="0.96" />
            <text x={textX} y={coord.y + 2} fill={color} className="text-[9px] font-mono font-black">
              {label}
            </text>
          </g>
        );
      })}
    </>
  );
}

function renderLevel(
  kind: "support" | "resistance",
  level: number,
  index: number,
  precision: number,
  mainSeries: any
) {
  if (!mainSeries) return null;
  const y = mainSeries.priceToCoordinate(level);
  if (y === null) return null;

  const isSupport = kind === "support";
  const color = isSupport ? "#2dd4bf" : "#fb7185";
  return (
    <g key={`${kind}-${level}-${index}`}>
      <line x1="0" y1={y} x2="5000" y2={y} stroke={isSupport ? "#14b8a6" : "#fb7185"} strokeWidth="1" strokeDasharray="6 5" opacity="0.55" />
      <text x="12" y={y - 5} fill={color} className="text-[9px] font-mono font-bold">
        {isSupport ? "S" : "R"} {level.toFixed(precision)}
      </text>
    </g>
  );
}
