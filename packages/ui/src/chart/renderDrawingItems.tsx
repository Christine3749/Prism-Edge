import type { DrawingBase, MarketSymbol } from "../../../shared/src/types";
import type { CoordinateResolver } from "./drawingTypes";

export function renderStoredDrawing(
  draw: DrawingBase,
  getCoordinates: CoordinateResolver,
  precision: number
) {
  if (draw.type === "horizalline" && draw.points[0]) {
    const coord = getCoordinates(draw.points[0]);
    if (!coord) return null;
    return (
      <g key={draw.id}>
        <line x1="0" y1={coord.y} x2="5000" y2={coord.y} stroke={draw.color} strokeWidth={draw.strokeWidth} />
        <text x="12" y={coord.y - 4} fill={draw.color} className="text-[10px] font-mono font-bold">
          {draw.points[0].price.toFixed(precision)}
        </text>
      </g>
    );
  }

  if (draw.type === "trendline" || draw.type === "ray") {
    return renderTrendOrRay(draw, getCoordinates);
  }

  if (draw.type === "fibonacci") {
    return renderFibonacci(draw, getCoordinates, precision);
  }

  if (draw.type === "text" && draw.text) {
    const coord = getCoordinates(draw.points[0]);
    if (!coord) return null;
    return (
      <g key={draw.id}>
        <rect x={coord.x} y={coord.y - 15} width={draw.text.length * 7 + 10} height="20" rx="4" fill="#020617" stroke="#fbbf24" strokeWidth="1" />
        <text x={coord.x + 5} y={coord.y} fill="#fbbf24" className="text-[10px] font-bold font-sans">
          {draw.text}
        </text>
      </g>
    );
  }

  if (draw.type === "ruler") {
    return renderRuler(draw, getCoordinates, precision);
  }

  return null;
}

export function renderCurrentDrawing(
  currentDrawing: DrawingBase | null,
  getCoordinates: CoordinateResolver
) {
  if (!currentDrawing || currentDrawing.type === "horizalline") return null;

  const coord1 = getCoordinates(currentDrawing.points[0]);
  const coord2 = getCoordinates(currentDrawing.points[1]);
  if (!coord1 || !coord2) return null;

  if (currentDrawing.type === "trendline" || currentDrawing.type === "ray") {
    return <line x1={coord1.x} y1={coord1.y} x2={coord2.x} y2={coord2.y} stroke={currentDrawing.color} strokeWidth={currentDrawing.strokeWidth} />;
  }

  if (currentDrawing.type === "fibonacci") {
    const dy = coord2.y - coord1.y;
    return (
      <g>
        <line x1={coord1.x} y1={coord1.y} x2={coord2.x} y2={coord2.y} stroke="#ff0055" strokeWidth="1" />
        {[0, 0.382, 0.5, 0.618, 1].map((ratio) => (
          <line key={ratio} x1={coord1.x} y1={coord1.y + dy * ratio} x2={coord2.x} y2={coord1.y + dy * ratio} stroke={currentDrawing.color} strokeWidth="1" />
        ))}
      </g>
    );
  }

  if (currentDrawing.type === "ruler") {
    const deltaPrice = currentDrawing.points[1].price - currentDrawing.points[0].price;
    const deltaPercent = ((deltaPrice / currentDrawing.points[0].price) * 100).toFixed(2);
    return (
      <g>
        <rect
          x={Math.min(coord1.x, coord2.x)}
          y={Math.min(coord1.y, coord2.y)}
          width={Math.abs(coord2.x - coord1.x)}
          height={Math.abs(coord2.y - coord1.y)}
          fill="#2f5f85"
          fillOpacity="0.08"
          stroke="#2f5f85"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        <text x={(coord1.x + coord2.x) / 2} y={(coord1.y + coord2.y) / 2} fill="#2f5f85" className="text-[10px] bg-slate-950 px-1 font-mono font-bold">
          {deltaPercent}%
        </text>
      </g>
    );
  }

  return null;
}

function renderTrendOrRay(draw: DrawingBase, getCoordinates: CoordinateResolver) {
  const coord1 = getCoordinates(draw.points[0]);
  const coord2 = getCoordinates(draw.points[1]);
  if (!coord1 || !coord2) return null;

  let x2Val = coord2.x;
  let y2Val = coord2.y;
  if (draw.type === "ray") {
    x2Val = coord1.x + (coord2.x - coord1.x) * 200;
    y2Val = coord1.y + (coord2.y - coord1.y) * 200;
  }
  return <line key={draw.id} x1={coord1.x} y1={coord1.y} x2={x2Val} y2={y2Val} stroke={draw.color} strokeWidth={draw.strokeWidth} />;
}

function renderFibonacci(draw: DrawingBase, getCoordinates: CoordinateResolver, precision: number) {
  const coord1 = getCoordinates(draw.points[0]);
  const coord2 = getCoordinates(draw.points[1]);
  if (!coord1 || !coord2) return null;

  const dy = coord2.y - coord1.y;
  const priceDy = draw.points[1].price - draw.points[0].price;
  const ratios = [
    { label: "1.000", ratio: 0, color: "#f43f5e" },
    { label: "0.618", ratio: 0.382, color: "#fb7185" },
    { label: "0.500", ratio: 0.5, color: "#f472b6" },
    { label: "0.382", ratio: 0.618, color: "#2f5f85" },
    { label: "0.236", ratio: 0.764, color: "#2dd4bf" },
    { label: "0.000", ratio: 1, color: "#10b981" }
  ];

  return (
    <g key={draw.id}>
      {ratios.map((r) => {
        const currY = coord1.y + dy * r.ratio;
        const currPrice = draw.points[0].price + priceDy * (1 - r.ratio);
        return (
          <g key={r.label}>
            <line x1={Math.min(coord1.x, coord2.x)} y1={currY} x2={Math.max(coord1.x, coord2.x) + 200} y2={currY} stroke={r.color} strokeWidth={1} strokeDasharray="4 3" />
            <text x={Math.max(coord1.x, coord2.x) + 4} y={currY - 2} fill={r.color} className="text-[9px] font-mono font-extrabold">
              {r.label} - {currPrice.toFixed(precision)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderRuler(draw: DrawingBase, getCoordinates: CoordinateResolver, precision: number) {
  const coord1 = getCoordinates(draw.points[0]);
  const coord2 = getCoordinates(draw.points[1]);
  if (!coord1 || !coord2) return null;

  const deltaPrice = draw.points[1].price - draw.points[0].price;
  const deltaPercent = ((deltaPrice / draw.points[0].price) * 100).toFixed(2);
  const midX = (coord1.x + coord2.x) / 2;
  const midY = (coord1.y + coord2.y) / 2;

  return (
    <g key={draw.id}>
      <rect x={Math.min(coord1.x, coord2.x)} y={Math.min(coord1.y, coord2.y)} width={Math.abs(coord2.x - coord1.x)} height={Math.abs(coord2.y - coord1.y)} fill="#2f5f85" fillOpacity="0.06" stroke="#2f5f85" strokeWidth="1.5" strokeDasharray="4,4" />
      <g transform={`translate(${midX - 58}, ${midY - 14})`}>
        <rect width="116" height="28" rx="6" fill="#020617" stroke="#2f5f85" strokeWidth="1" />
        <text x="58" y="11" fill="#e2e8f0" textAnchor="middle" className="text-[9px] font-mono font-bold select-none">
          Change: {deltaPrice > 0 ? "+" : ""}{deltaPrice.toFixed(precision)}
        </text>
        <text x="58" y="21" fill="#2f5f85" textAnchor="middle" className="text-[9px] font-mono font-black select-none">
          Percent: {deltaPercent}%
        </text>
      </g>
    </g>
  );
}
