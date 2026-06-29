import type { AnalysisRunResponse, Candle, MarketDataStatus, MarketSymbol } from "./types";

export type PrismBias = "long" | "short" | "watch" | "defense";

export interface PrismIntelligence {
  score: number;
  bias: PrismBias;
  setup: "breakout" | "momentum" | "reversal" | "defense" | "observe";
  risk: "normal" | "elevated" | "stress" | "feed";
  momentumPct: number;
  volatilityPct: number;
  drawdownPct: number;
  volumeRatio: number;
  confidencePct: number;
  headlineKey: "trendLong" | "trendShort" | "riskDefense" | "watchSetup";
}

type IntelligenceLanguage = "en" | "zh" | "tc";

export function buildPrismIntelligence(
  symbol: MarketSymbol,
  candles: Candle[] = [],
  marketStatus?: MarketDataStatus,
  analysisResult?: AnalysisRunResponse | null
): PrismIntelligence {
  const recent = candles.slice(-34);
  const latest = recent[recent.length - 1];
  const base = recent[Math.max(0, recent.length - 21)];
  const momentumPct = latest && base && base.close > 0
    ? ((latest.close - base.close) / base.close) * 100
    : symbol.change24h;

  const ranges = recent.slice(-20).map((candle) => {
    const mid = Math.max(candle.close, 0.0000001);
    return ((candle.high - candle.low) / mid) * 100;
  });
  const volatilityPct = ranges.length
    ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length
    : Math.min(8, Math.abs(symbol.change24h) * 0.8);

  const highWindow = recent.length ? Math.max(...recent.map((candle) => candle.high)) : symbol.price;
  const drawdownPct = highWindow > 0 ? ((symbol.price - highWindow) / highWindow) * 100 : 0;

  const volumes = recent.slice(-20).map((candle) => candle.volume).filter((value) => value > 0);
  const avgVolume = volumes.length ? volumes.reduce((sum, value) => sum + value, 0) / volumes.length : symbol.volume24h;
  const latestVolume = latest?.volume || symbol.volume24h;
  const volumeRatio = avgVolume > 0 ? latestVolume / avgVolume : 1;

  const confidencePct = Math.round((marketStatus?.confidence ?? inferSymbolConfidence(symbol)) * 100);
  const permission = analysisResult?.tradePermission;
  const modelBias = analysisResult?.trend === "bullish" ? 10 : analysisResult?.trend === "bearish" ? -8 : 0;
  const permissionBias = permission?.allowed ? 5 : permission ? -10 : 0;
  const dataBias = (confidencePct - 55) * 0.16;

  const score = clamp(
    Math.round(
      50 +
      clamp(symbol.change24h * 3.2, -24, 24) +
      clamp(momentumPct * 2.1, -20, 20) +
      clamp((volumeRatio - 1) * 9, -7, 12) +
      modelBias +
      permissionBias +
      dataBias
    ),
    1,
    99
  );

  const risk = marketStatus?.state === "error" || marketStatus?.state === "stale"
    ? "feed"
    : volatilityPct > 5.8 || drawdownPct < -11
      ? "stress"
      : volatilityPct > 3.2 || drawdownPct < -6
        ? "elevated"
        : "normal";

  const bias = inferBias(score, momentumPct, symbol.change24h, risk, permission?.mode);
  const setup = inferSetup(score, momentumPct, symbol.change24h, bias, risk);
  const headlineKey = bias === "long"
    ? "trendLong"
    : bias === "short"
      ? "trendShort"
      : bias === "defense"
        ? "riskDefense"
        : "watchSetup";

  return {
    score,
    bias,
    setup,
    risk,
    momentumPct,
    volatilityPct,
    drawdownPct,
    volumeRatio,
    confidencePct,
    headlineKey
  };
}

export function describePrismIntelligence(
  intelligence: PrismIntelligence,
  symbol: MarketSymbol,
  lang: IntelligenceLanguage
) {
  const zh = lang === "zh" || lang === "tc";
  const bias = getBiasLabel(intelligence.bias, lang);
  const setup = getSetupLabel(intelligence.setup, lang);
  const risk = getRiskLabel(intelligence.risk, lang);

  const headline = zh
    ? headlineZh(intelligence.headlineKey, symbol.id)
    : headlineEn(intelligence.headlineKey, symbol.id);
  const action = zh
    ? actionZh(intelligence)
    : actionEn(intelligence);

  const evidence = zh
    ? [
        `20K 动量 ${formatSigned(intelligence.momentumPct)}%`,
        `成交量 ${intelligence.volumeRatio.toFixed(1)}x`,
        `回撤 ${formatSigned(intelligence.drawdownPct)}%`,
        `行情可信度 ${intelligence.confidencePct}%`
      ]
    : [
        `20-bar momentum ${formatSigned(intelligence.momentumPct)}%`,
        `Volume ${intelligence.volumeRatio.toFixed(1)}x`,
        `Drawdown ${formatSigned(intelligence.drawdownPct)}%`,
        `Feed confidence ${intelligence.confidencePct}%`
      ];

  return { headline, action, evidence, bias, setup, risk };
}

export function getBiasLabel(bias: PrismBias, lang: IntelligenceLanguage) {
  const zh = lang === "zh" || lang === "tc";
  if (bias === "long") return zh ? "多头" : "Long";
  if (bias === "short") return zh ? "空头" : "Short";
  if (bias === "defense") return zh ? "防御" : "Defense";
  return zh ? "观察" : "Watch";
}

export function getSetupLabel(setup: PrismIntelligence["setup"], lang: IntelligenceLanguage) {
  const zh = lang === "zh" || lang === "tc";
  const labels = {
    breakout: zh ? "突破" : "Breakout",
    momentum: zh ? "动量" : "Momentum",
    reversal: zh ? "反转" : "Reversal",
    defense: zh ? "防御" : "Defense",
    observe: zh ? "观察" : "Observe"
  };
  return labels[setup];
}

export function getRiskLabel(risk: PrismIntelligence["risk"], lang: IntelligenceLanguage) {
  const zh = lang === "zh" || lang === "tc";
  const labels = {
    normal: zh ? "正常" : "Normal",
    elevated: zh ? "抬升" : "Elevated",
    stress: zh ? "压力" : "Stress",
    feed: zh ? "数据风险" : "Feed risk"
  };
  return labels[risk];
}

function inferBias(
  score: number,
  momentumPct: number,
  change24h: number,
  risk: PrismIntelligence["risk"],
  permissionMode?: string
): PrismBias {
  if (permissionMode === "reject" || permissionMode === "reduce_only" || risk === "feed") return "defense";
  if (risk === "stress" && score < 72) return "defense";
  if (score >= 68 && (momentumPct >= 0 || change24h >= 0)) return "long";
  if (score >= 64 && (momentumPct < 0 || change24h < 0)) return "short";
  return "watch";
}

function inferSetup(
  score: number,
  momentumPct: number,
  change24h: number,
  bias: PrismBias,
  risk: PrismIntelligence["risk"]
): PrismIntelligence["setup"] {
  if (bias === "defense" || risk === "feed") return "defense";
  if (score >= 76 && momentumPct > 1.2) return "breakout";
  if (score >= 66 && change24h > 0) return "momentum";
  if (score >= 62 && momentumPct < 0) return "reversal";
  return "observe";
}

function inferSymbolConfidence(symbol: MarketSymbol) {
  if (symbol.lastDataState === "live" || symbol.dataProvider === "binance" || symbol.dataProvider === "coinbase") return 0.92;
  if (symbol.lastDataState === "delayed" || symbol.dataProvider === "yahoo") return 0.7;
  if (symbol.lastDataState === "error") return 0.08;
  return 0.32;
}

function headlineZh(key: PrismIntelligence["headlineKey"], symbolId: string) {
  if (key === "trendLong") return `${symbolId} 多头动能占优`;
  if (key === "trendShort") return `${symbolId} 空头压力占优`;
  if (key === "riskDefense") return `${symbolId} 进入防御观察`;
  return `${symbolId} 等待确认信号`;
}

function headlineEn(key: PrismIntelligence["headlineKey"], symbolId: string) {
  if (key === "trendLong") return `${symbolId} long momentum leads`;
  if (key === "trendShort") return `${symbolId} downside pressure leads`;
  if (key === "riskDefense") return `${symbolId} enters defense watch`;
  return `${symbolId} needs confirmation`;
}

function actionZh(intelligence: PrismIntelligence) {
  if (intelligence.bias === "long") return "优先观察回踩承接，等待量能确认。";
  if (intelligence.bias === "short") return "优先观察反弹受阻，控制追空距离。";
  if (intelligence.bias === "defense") return "降低动作频率，先确认数据与波动压力。";
  return "保持观察，等待突破、反转或 DGWM 二次确认。";
}

function actionEn(intelligence: PrismIntelligence) {
  if (intelligence.bias === "long") return "Watch pullback absorption and require volume confirmation.";
  if (intelligence.bias === "short") return "Watch failed rebounds and avoid extended short entries.";
  if (intelligence.bias === "defense") return "Lower action frequency until feed and volatility clear.";
  return "Stay on watch until breakout, reversal, or DGWM confirmation.";
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
