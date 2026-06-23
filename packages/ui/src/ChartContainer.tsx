import React, { useEffect, useRef, useState, useCallback } from "react";
import { createChart, IChartApi, ISeriesApi, LineStyle, UTCTimestamp, CandlestickSeries, LineSeries, HistogramSeries } from "lightweight-charts";
import { 
  MarketSymbol, Candle, IndicatorConfig, DrawingTool, DrawingBase, AppSettings, DrawingPoint
} from "../../shared/src/types";
import { 
  calculateSMA, calculateEMA, calculateBollingerBands, calculateRSI, calculateMACD, calculateVWAP
} from "../../shared/src/indicators";

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
  currentTimeframe
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<HTMLDivElement>(null);
  const oscillatorChartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
  const [oscInstance, setOscInstance] = useState<IChartApi | null>(null);
  const [mainSeries, setMainSeries] = useState<any | null>(null);
  const [viewState, setViewState] = useState({ scale: 1, rangeOffset: 0 });
  const [currentDrawing, setCurrentDrawing] = useState<DrawingBase | null>(null);

  useEffect(() => {
    if (!containerRef.current || !mainChartRef.current) return;

    mainChartRef.current.innerHTML = "";
    if (oscillatorChartRef.current) oscillatorChartRef.current.innerHTML = "";

    const isOscActive = indicatorConfig.rsi.active || indicatorConfig.macd.active;
    const containerHeight = Math.max(50, containerRef.current.clientHeight);
    
    const mainHeight = Math.max(20, isOscActive ? Math.floor(containerHeight * 0.68) : containerHeight - 4);
    const oscHeight = isOscActive ? Math.max(20, Math.floor(containerHeight * 0.3)) : 0;

    const themeColors = {
      bg: settings.solidBackground ? "#0a0e14" : "radial-gradient(circle at top, #0f141c 0%, #080a0f 100%)",
      text: "#9ca3af",
      grid: settings.gridLines ? "#1f2937/40" : "#1f293700",
    };

    const chart = createChart(mainChartRef.current, {
      width: mainChartRef.current.clientWidth,
      height: mainHeight,
      layout: {
        background: { color: settings.solidBackground ? "#020617" : "transparent" },
        textColor: themeColors.text,
        fontFamily: "Inter, sans-serif",
      },
      grid: {
        vertLines: { color: settings.gridLines ? "#1e293b" : "transparent" },
        horzLines: { color: settings.gridLines ? "#1e293b" : "transparent" },
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
    }) as any;

    let targetSeries: any = null;
    targetSeries = chart.addSeries(CandlestickSeries, {
      upColor: settings.upColor,
      downColor: settings.downColor,
      borderUpColor: settings.upColor,
      borderDownColor: settings.downColor,
      wickUpColor: settings.upColor,
      wickDownColor: settings.downColor,
    });

    setMainSeries(targetSeries);
    setChartInstance(chart);

    let subChart: any = null;
    if (isOscActive && oscillatorChartRef.current) {
      subChart = createChart(oscillatorChartRef.current, {
        width: oscillatorChartRef.current.clientWidth,
        height: oscHeight,
        layout: {
          background: { color: settings.solidBackground ? "#020617" : "transparent" },
          textColor: themeColors.text,
          fontFamily: "Inter, sans-serif",
        },
        grid: {
          vertLines: { color: settings.gridLines ? "#1e293b" : "transparent" },
          horzLines: { color: settings.gridLines ? "#1e293b" : "transparent" },
        },
        timeScale: {
          borderColor: "#334155",
          visible: true,
        },
        rightPriceScale: {
          borderColor: "#334155",
        }
      }) as any;
      setOscInstance(subChart);
    } else {
      setOscInstance(null);
    }

    if (candles.length > 0) {
      const chartCandles = candles.map(c => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      targetSeries.setData(chartCandles);

      if (indicatorConfig.sma.active) {
        const smaData = calculateSMA(candles, indicatorConfig.sma.period);
        if (smaData.length > 0) {
          const smaLine = chart.addSeries(LineSeries, {
            color: indicatorConfig.sma.color,
            lineWidth: 1.5,
            title: `SMA (${indicatorConfig.sma.period})`
          });
          smaLine.setData(smaData as any[]);
        }
      }

      if (indicatorConfig.ema.active) {
        const emaData = calculateEMA(candles, indicatorConfig.ema.period);
        if (emaData.length > 0) {
          const emaLine = chart.addSeries(LineSeries, {
            color: indicatorConfig.ema.color,
            lineWidth: 1.5,
            title: `EMA (${indicatorConfig.ema.period})`
          });
          emaLine.setData(emaData as any[]);
        }
      }

      if (indicatorConfig.bollinger.active) {
        const bollVal = calculateBollingerBands(candles, indicatorConfig.bollinger.period, indicatorConfig.bollinger.multiplier);
        if (bollVal.basis.length > 0) {
          const bBasis = chart.addSeries(LineSeries, {
            color: indicatorConfig.bollinger.colorBasis,
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            title: `BOLL Basis (${indicatorConfig.bollinger.period})`
          });
          const bUpper = chart.addSeries(LineSeries, {
            color: indicatorConfig.bollinger.colorUpper,
            lineWidth: 1.2,
            title: "BOLL Upper"
          });
          const bLower = chart.addSeries(LineSeries, {
            color: indicatorConfig.bollinger.colorLower,
            lineWidth: 1.2,
            title: "BOLL Lower"
          });

          bBasis.setData(bollVal.basis as any[]);
          bUpper.setData(bollVal.upper as any[]);
          bLower.setData(bollVal.lower as any[]);
        }
      }

      if (subChart) {
        if (indicatorConfig.rsi.active) {
          const rsiData = calculateRSI(candles, indicatorConfig.rsi.period);
          if (rsiData.length > 0) {
            const rsiLine = subChart.addSeries(LineSeries, {
              color: indicatorConfig.rsi.color,
              lineWidth: 1.5,
              title: `RSI (${indicatorConfig.rsi.period})`
            });
            rsiLine.setData(rsiData as any[]);
          }
        } else if (indicatorConfig.macd.active) {
          const macdVal = calculateMACD(candles, indicatorConfig.macd.fast, indicatorConfig.macd.slow, indicatorConfig.macd.signal);
          
          if (macdVal.macd.length > 0) {
            const mLine = subChart.addSeries(LineSeries, {
              color: indicatorConfig.macd.colorMacd,
              lineWidth: 1.2,
              title: `MACD (${indicatorConfig.macd.fast},${indicatorConfig.macd.slow},${indicatorConfig.macd.signal})`
            });
            const sLine = subChart.addSeries(LineSeries, {
              color: indicatorConfig.macd.colorSignal,
              lineWidth: 1.2,
              title: "Signal"
            });
            const mHist = subChart.addSeries(HistogramSeries, {
              title: "Histogram"
            });

            mLine.setData(macdVal.macd as any[]);
            sLine.setData(macdVal.signal as any[]);

            const histColored = macdVal.histogram.map(h => ({
              time: h.time as any,
              value: h.value,
              color: h.value >= 0 ? indicatorConfig.macd.colorHistUp : indicatorConfig.macd.colorHistDown
            }));
            mHist.setData(histColored);
          }
        }
      }
    }

    const onMainVisibleChange = () => {
      const timeScale = chart.timeScale();
      const visibleRange = timeScale.getVisibleRange();
      if (subChart && visibleRange) {
        subChart.timeScale().setVisibleRange(visibleRange);
      }
      setViewState({
        scale: 1,
        rangeOffset: Math.random()
      });
    };

    chart.timeScale().subscribeVisibleTimeRangeChange(onMainVisibleChange);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) continue;
        
        const nextIsOscActive = indicatorConfig.rsi.active || indicatorConfig.macd.active;
        const nextMainHeight = Math.max(20, nextIsOscActive ? Math.floor(height * 0.68) : height - 4);
        const nextOscHeight = nextIsOscActive ? Math.max(20, Math.floor(height * 0.3)) : 0;

        chart.resize(width, nextMainHeight);
        if (subChart) {
          subChart.resize(width, nextOscHeight);
        }
        onMainVisibleChange();
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      if (subChart) subChart.remove();
    };

  }, [candles, indicatorConfig, settings]);

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
  }, [chartInstance, mainSeries]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === "cursor" || !chartInstance || !mainSeries) return;

    const anchors = getCoordinatesFromPixels(e.clientX, e.clientY);
    if (!anchors) return;

    const id = Math.random().toString(36).substring(7);

    if (activeTool === "horizalline") {
      const nextDraw: DrawingBase = {
        id,
        type: "horizalline",
        color: "#fbbf24",
        strokeWidth: 2,
        points: [anchors],
        isCompleted: true
      };
      onUpdateDrawings([...drawings, nextDraw]);
      onSelectTool("cursor");
    } else {
      const freshDraw: DrawingBase = {
        id,
        type: activeTool,
        color: activeTool === "ruler" ? "#22d3ee" : "#22d3ee",
        strokeWidth: 2,
        points: [anchors, anchors],
        isCompleted: false
      };
      setCurrentDrawing(freshDraw);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentDrawing || !chartInstance || !mainSeries) return;

    const anchors = getCoordinatesFromPixels(e.clientX, e.clientY);
    if (!anchors) return;

    setCurrentDrawing({
      ...currentDrawing,
      points: [currentDrawing.points[0], anchors]
    });
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentDrawing) return;

    const anchors = getCoordinatesFromPixels(e.clientX, e.clientY);
    if (anchors) {
      if (currentDrawing.type === "text") {
        const userLabel = prompt("Enter text markup details:", "Note mark");
        if (userLabel) {
          const finished = {
            ...currentDrawing,
            text: userLabel,
            points: [currentDrawing.points[0]],
            isCompleted: true
          };
          onUpdateDrawings([...drawings, finished]);
        }
      } else {
        const finished = {
          ...currentDrawing,
          points: [currentDrawing.points[0], anchors],
          isCompleted: true
        };
        onUpdateDrawings([...drawings, finished]);
      }
    }

    setCurrentDrawing(null);
    onSelectTool("cursor");
  };

  return (
    <div 
      className="flex-grow flex flex-col relative bg-[#020617] overflow-hidden min-h-[180px] select-none" 
      ref={containerRef}
      id="chart_canvas_zone"
    >
      <div className="flex-grow min-h-0 relative" ref={mainChartRef}></div>

      <div 
        className="w-full shrink-0 relative bg-slate-950 border-t border-slate-900" 
        ref={oscillatorChartRef}
        style={{
          height: (indicatorConfig.rsi.active || indicatorConfig.macd.active) ? "30%" : "0px",
          display: (indicatorConfig.rsi.active || indicatorConfig.macd.active) ? "block" : "none"
        }}
      ></div>

      <svg
        ref={svgRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`absolute inset-0 w-full cursor-crosshair z-25 pointer-events-auto h-[70%]`}
        style={{
          cursor: activeTool === "cursor" ? "default" : "crosshair",
          pointerEvents: activeTool === "cursor" ? "none" : "auto",
        }}
      >
        {drawings.map((draw) => {
          if (draw.type === "horizalline" && draw.points[0]) {
            const coord = getCoordinates(draw.points[0]);
            if (!coord) return null;
            return (
              <g key={draw.id}>
                <line
                  x1="0"
                  y1={coord.y}
                  x2="5000"
                  y2={coord.y}
                  stroke={draw.color}
                  strokeWidth={draw.strokeWidth}
                />
                <text x="12" y={coord.y - 4} fill={draw.color} className="text-[10px] font-mono font-bold">
                  {draw.points[0].price.toFixed(currentSymbol.precision)}
                </text>
              </g>
            );
          }

          if (draw.type === "trendline" || draw.type === "ray") {
            const coord1 = getCoordinates(draw.points[0]);
            const coord2 = getCoordinates(draw.points[1]);
            if (!coord1 || !coord2) return null;

            let x2Val: number = coord2.x as number;
            let y2Val: number = coord2.y as number;

            if (draw.type === "ray") {
              const dx = coord2.x - coord1.x;
              const dy = coord2.y - coord1.y;
              x2Val = coord1.x + dx * 200;
              // Project ray infinitely towards edge
              y2Val = coord1.y + dy * 200;
            }

            return (
              <line
                key={draw.id}
                x1={coord1.x}
                y1={coord1.y}
                x2={x2Val}
                y2={y2Val}
                stroke={draw.color}
                strokeWidth={draw.strokeWidth}
              />
            );
          }

          if (draw.type === "fibonacci") {
            const coord1 = getCoordinates(draw.points[0]);
            const coord2 = getCoordinates(draw.points[1]);
            if (!coord1 || !coord2) return null;

            const dy = coord2.y - coord1.y;
            const priceDy = draw.points[1].price - draw.points[0].price;

            const ratios = [
              { label: "1.000", ratio: 0, color: "#f43f5e" },
              { label: "0.618", ratio: 0.382, color: "#fb7185" },
              { label: "0.500", ratio: 0.5, color: "#f472b6" },
              { label: "0.382", ratio: 0.618, color: "#06b6d4" },
              { label: "0.236", ratio: 0.764, color: "#2dd4bf" },
              { label: "0.000", ratio: 1, color: "#10b981" }
            ];

            return (
              <g key={draw.id}>
                {ratios.map((r, ri) => {
                  const currY = coord1.y + dy * r.ratio;
                  const currPrice = draw.points[0].price + priceDy * (1 - r.ratio);
                  return (
                    <g key={ri}>
                      <line
                        x1={Math.min(coord1.x, coord2.x)}
                        y1={currY}
                        x2={Math.max(coord1.x, coord2.x) + 200}
                        y2={currY}
                        stroke={r.color}
                        strokeWidth={1}
                        strokeDasharray="4 3"
                      />
                      <text
                        x={Math.max(coord1.x, coord2.x) + 4}
                        y={currY - 2}
                        fill={r.color}
                        className="text-[9px] font-mono font-extrabold"
                      >
                        {r.label} - {currPrice.toFixed(currentSymbol.precision)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          }

          if (draw.type === "text" && draw.text) {
            const coord = getCoordinates(draw.points[0]);
            if (!coord) return null;
            return (
              <g key={draw.id}>
                <rect 
                  x={coord.x} 
                  y={coord.y - 15} 
                  width={draw.text.length * 7 + 10} 
                  height="20" 
                  rx="4" 
                  fill="#020617" 
                  stroke="#fbbf24" 
                  strokeWidth="1"
                />
                <text x={coord.x + 5} y={coord.y} fill="#fbbf24" className="text-[10px] font-bold font-sans">
                  {draw.text}
                </text>
              </g>
            );
          }

          if (draw.type === "ruler") {
            const coord1 = getCoordinates(draw.points[0]);
            const coord2 = getCoordinates(draw.points[1]);
            if (!coord1 || !coord2) return null;

            const deltaPrice = draw.points[1].price - draw.points[0].price;
            const deltaPercent = ((deltaPrice / draw.points[0].price) * 100).toFixed(2);
            const midX = (coord1.x + coord2.x) / 2;
            const midY = (coord1.y + coord2.y) / 2;

            return (
              <g key={draw.id}>
                <rect
                  x={Math.min(coord1.x, coord2.x)}
                  y={Math.min(coord1.y, coord2.y)}
                  width={Math.abs(coord2.x - coord1.x)}
                  height={Math.abs(coord2.y - coord1.y)}
                  fill="#06b6d4"
                  fillOpacity="0.06"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
                <g transform={`translate(${midX - 58}, ${midY - 14})`}>
                  <rect width="116" height="28" rx="6" fill="#020617" stroke="#06b6d4" strokeWidth="1" />
                  <text x="58" y="11" fill="#e2e8f0" textAnchor="middle" className="text-[9px] font-mono font-bold select-none">
                    Change: {deltaPrice > 0 ? "+" : ""}{deltaPrice.toFixed(currentSymbol.precision)}
                  </text>
                  <text x="58" y="21" fill="#06b6d4" textAnchor="middle" className="text-[9px] font-mono font-black select-none">
                     Percent: {deltaPercent}%
                  </text>
                </g>
              </g>
            );
          }

          return null;
        })}

        {currentDrawing && (() => {
          if (currentDrawing.type === "horizalline") return null;

          const coord1 = getCoordinates(currentDrawing.points[0]);
          const coord2 = getCoordinates(currentDrawing.points[1]);
          if (!coord1 || !coord2) return null;

          if (currentDrawing.type === "trendline" || currentDrawing.type === "ray") {
            return (
              <line
                x1={coord1.x}
                y1={coord1.y}
                x2={coord2.x}
                y2={coord2.y}
                stroke={currentDrawing.color}
                strokeWidth={currentDrawing.strokeWidth}
              />
            );
          }

          if (currentDrawing.type === "fibonacci") {
            const dy = coord2.y - coord1.y;
            return (
              <g>
                <line x1={coord1.x} y1={coord1.y} x2={coord2.x} y2={coord2.y} stroke="#ff0055" strokeWidth="1" />
                <line x1={coord1.x} y1={coord1.y} x2={coord2.x} y2={coord1.y} stroke={currentDrawing.color} strokeWidth="1" />
                <line x1={coord1.x} y1={coord1.y + dy * 0.382} x2={coord2.x} y2={coord1.y + dy * 0.382} stroke={currentDrawing.color} strokeWidth="1" />
                <line x1={coord1.x} y1={coord1.y + dy * 0.5} x2={coord2.x} y2={coord1.y + dy * 0.5} stroke={currentDrawing.color} strokeWidth="1" />
                <line x1={coord1.x} y1={coord1.y + dy * 0.618} x2={coord2.x} y2={coord1.y + dy * 0.618} stroke={currentDrawing.color} strokeWidth="1" />
                <line x1={coord1.x} y1={coord2.y} x2={coord2.x} y2={coord2.y} stroke={currentDrawing.color} strokeWidth="1" />
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
                  fill="#06b6d4"
                  fillOpacity="0.08"
                  stroke="#06b6d4"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text x={(coord1.x + coord2.x) / 2} y={(coord1.y + coord2.y) / 2} fill="#06b6d4" className="text-[10px] bg-slate-950 px-1 font-mono font-bold">
                  {deltaPercent}%
                </text>
              </g>
            );
          }

          return null;
        })()}
      </svg>
      
      <div className="absolute right-3 top-3 text-[9px] font-mono text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 select-none z-20 uppercase tracking-widest hidden md:block">
        Focus: {currentSymbol.id} • {currentTimeframe}
      </div>

    </div>
  );
}
