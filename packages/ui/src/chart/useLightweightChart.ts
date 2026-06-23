import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type UTCTimestamp
} from "lightweight-charts";
import type { AppSettings, Candle, IndicatorConfig } from "../../../shared/src/types";
import {
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateSMA
} from "../../../shared/src/indicators";

interface UseLightweightChartParams {
  containerRef: RefObject<HTMLDivElement | null>;
  mainChartRef: RefObject<HTMLDivElement | null>;
  oscillatorChartRef: RefObject<HTMLDivElement | null>;
  candles: Candle[];
  indicatorConfig: IndicatorConfig;
  settings: AppSettings;
  chartType: string;
  isOscActive: boolean;
}

export function useLightweightChart({
  containerRef,
  mainChartRef,
  oscillatorChartRef,
  candles,
  indicatorConfig,
  settings,
  chartType,
  isOscActive
}: UseLightweightChartParams) {
  const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
  const [mainSeries, setMainSeries] = useState<any | null>(null);
  const indicatorSeriesRef = useRef<Record<string, any>>({});
  const oscChartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !mainChartRef.current) return;

    mainChartRef.current.innerHTML = "";
    if (oscillatorChartRef.current) oscillatorChartRef.current.innerHTML = "";

    const containerHeight = Math.max(50, containerRef.current.clientHeight);
    const mainHeight = Math.max(20, isOscActive ? Math.floor(containerHeight * 0.68) : containerHeight - 4);
    const oscHeight = isOscActive ? Math.max(20, Math.floor(containerHeight * 0.3)) : 0;
    const chart = createBaseChart(mainChartRef.current, mainHeight, settings);
    const targetSeries = createMainSeries(chart, chartType, settings);
    const subChart = isOscActive && oscillatorChartRef.current
      ? createBaseChart(oscillatorChartRef.current, oscHeight, settings)
      : null;

    indicatorSeriesRef.current = createIndicatorSeries(chart, subChart, indicatorConfig);
    indicatorSeriesRef.current.volume = createVolumeSeries(chart);
    oscChartRef.current = subChart;
    setMainSeries(targetSeries);
    setChartInstance(chart);

    const syncVisibleRange = () => {
      const visibleRange = chart.timeScale().getVisibleRange();
      if (subChart && visibleRange) subChart.timeScale().setVisibleRange(visibleRange);
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(syncVisibleRange);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) continue;
        const nextMainHeight = Math.max(20, isOscActive ? Math.floor(height * 0.68) : height - 4);
        const nextOscHeight = isOscActive ? Math.max(20, Math.floor(height * 0.3)) : 0;
        chart.resize(width, nextMainHeight);
        if (subChart) subChart.resize(width, nextOscHeight);
        syncVisibleRange();
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      chart.timeScale().unsubscribeVisibleTimeRangeChange(syncVisibleRange);
      chart.remove();
      if (subChart) subChart.remove();
      oscChartRef.current = null;
      setChartInstance(null);
      setMainSeries(null);
    };
  }, [chartType, indicatorConfig, settings, isOscActive]);

  useEffect(() => {
    if (!mainSeries || !chartInstance) return;
    const refs = indicatorSeriesRef.current;
    const chartCandles = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));
    const closeLineData = candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close }));

    mainSeries.setData(chartType === "line" || chartType === "area" ? closeLineData : chartCandles);
    refs.sma?.setData(calculateSMA(candles, indicatorConfig.sma.period) as any[]);
    refs.ema?.setData(calculateEMA(candles, indicatorConfig.ema.period) as any[]);
    setBollingerData(refs, candles, indicatorConfig);
    refs.volume?.setData(buildVolumeData(candles, settings));
    refs.rsi?.setData(calculateRSI(candles, indicatorConfig.rsi.period) as any[]);
    setMacdData(refs, candles, indicatorConfig);
  }, [candles, mainSeries, chartInstance, chartType, indicatorConfig, settings.upColor, settings.downColor]);

  return { chartInstance, mainSeries };
}

function createBaseChart(element: HTMLDivElement, height: number, settings: AppSettings) {
  return createChart(element, {
    width: element.clientWidth,
    height,
    layout: {
      background: { color: settings.solidBackground ? "#020617" : "transparent" },
      textColor: "#9ca3af",
      fontFamily: "Inter, ui-monospace, sans-serif",
      attributionLogo: false
    },
    crosshair: {
      vertLine: { color: "rgba(148, 163, 184, 0.42)", style: LineStyle.Dashed, labelBackgroundColor: "#0f172a" },
      horzLine: { color: "rgba(148, 163, 184, 0.42)", style: LineStyle.Dashed, labelBackgroundColor: "#0f172a" }
    },
    grid: {
      vertLines: { color: settings.gridLines ? "rgba(30, 41, 59, 0.62)" : "transparent" },
      horzLines: { color: settings.gridLines ? "rgba(30, 41, 59, 0.62)" : "transparent" }
    },
    timeScale: { borderColor: "#1e293b", timeVisible: true, secondsVisible: false },
    rightPriceScale: { borderColor: "#1e293b" }
  }) as any;
}

function createMainSeries(chart: any, chartType: string, settings: AppSettings) {
  if (chartType === "line") {
    return chart.addSeries(LineSeries, { color: "#2962ff", lineWidth: 2, crosshairMarkerVisible: false });
  }
  if (chartType === "area") {
    return chart.addSeries(AreaSeries, {
      lineColor: "#2962ff",
      topColor: "rgba(41, 98, 255, 0.28)",
      bottomColor: "rgba(41, 98, 255, 0.02)",
      lineWidth: 2
    });
  }
  if (chartType === "bars") {
    return chart.addSeries(BarSeries, { upColor: settings.upColor, downColor: settings.downColor, thinBars: false });
  }
  return chart.addSeries(CandlestickSeries, {
    upColor: settings.upColor,
    downColor: settings.downColor,
    borderUpColor: settings.upColor,
    borderDownColor: settings.downColor,
    wickUpColor: settings.upColor,
    wickDownColor: settings.downColor
  });
}

function createIndicatorSeries(chart: any, subChart: any, config: IndicatorConfig) {
  const refs: Record<string, any> = {};
  if (config.sma.active) refs.sma = chart.addSeries(LineSeries, { color: config.sma.color, lineWidth: 1.5, title: `SMA (${config.sma.period})` });
  if (config.ema.active) refs.ema = chart.addSeries(LineSeries, { color: config.ema.color, lineWidth: 1.5, title: `EMA (${config.ema.period})` });
  if (config.bollinger.active) {
    refs.bollBasis = chart.addSeries(LineSeries, { color: config.bollinger.colorBasis, lineWidth: 1, lineStyle: LineStyle.Dotted, title: `BOLL Basis (${config.bollinger.period})` });
    refs.bollUpper = chart.addSeries(LineSeries, { color: config.bollinger.colorUpper, lineWidth: 1.2, title: "BOLL Upper" });
    refs.bollLower = chart.addSeries(LineSeries, { color: config.bollinger.colorLower, lineWidth: 1.2, title: "BOLL Lower" });
  }
  if (subChart && config.rsi.active) refs.rsi = subChart.addSeries(LineSeries, { color: config.rsi.color, lineWidth: 1.5, title: `RSI (${config.rsi.period})` });
  if (subChart && config.macd.active) {
    refs.macd = subChart.addSeries(LineSeries, { color: config.macd.colorMacd, lineWidth: 1.2, title: `MACD (${config.macd.fast},${config.macd.slow},${config.macd.signal})` });
    refs.macdSignal = subChart.addSeries(LineSeries, { color: config.macd.colorSignal, lineWidth: 1.2, title: "Signal" });
    refs.macdHist = subChart.addSeries(HistogramSeries, { title: "Histogram" });
  }
  return refs;
}

function createVolumeSeries(chart: any) {
  const series = chart.addSeries(HistogramSeries, {
    priceFormat: { type: "volume" },
    priceScaleId: "",
    lastValueVisible: false,
    priceLineVisible: false
  } as any);
  (series as any).priceScale?.().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
  return series;
}

function buildVolumeData(candles: Candle[], settings: AppSettings) {
  if (!candles.some((candle) => candle.volume > 0)) return [];
  return candles.map((candle) => ({
    time: candle.time as UTCTimestamp,
    value: candle.volume,
    color: candle.close >= candle.open ? `${settings.upColor}44` : `${settings.downColor}44`
  }));
}

function setBollingerData(refs: Record<string, any>, candles: Candle[], config: IndicatorConfig) {
  if (!refs.bollBasis) return;
  const bollVal = calculateBollingerBands(candles, config.bollinger.period, config.bollinger.multiplier);
  refs.bollBasis.setData(bollVal.basis as any[]);
  refs.bollUpper.setData(bollVal.upper as any[]);
  refs.bollLower.setData(bollVal.lower as any[]);
}

function setMacdData(refs: Record<string, any>, candles: Candle[], config: IndicatorConfig) {
  if (!refs.macd) return;
  const macdVal = calculateMACD(candles, config.macd.fast, config.macd.slow, config.macd.signal);
  refs.macd.setData(macdVal.macd as any[]);
  refs.macdSignal.setData(macdVal.signal as any[]);
  refs.macdHist.setData(macdVal.histogram.map((h) => ({
    time: h.time as any,
    value: h.value,
    color: h.value >= 0 ? config.macd.colorHistUp : config.macd.colorHistDown
  })));
}
