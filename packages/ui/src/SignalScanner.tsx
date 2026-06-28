import { Activity, ChevronRight, Crosshair, Radar, ShieldAlert, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol } from "../../shared/src/types";
import type { Language } from "../../shared/src/translations";

interface SignalScannerProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  onHandleHoverChange?: (active: boolean) => void;
}

type ScannerSide = "long" | "short" | "watch" | "defense";

interface ScannerRow {
  symbol: MarketSymbol;
  score: number;
  side: ScannerSide;
  setup: string;
  risk: string;
  source: string;
}

export default function SignalScanner({
  currentSymbol,
  symbolsList,
  marketStatus,
  analysisResult,
  lang,
  onSymbolSelect,
  onHandleHoverChange
}: SignalScannerProps) {
  const [collapsed, setCollapsed] = useState(true);
  const labels = getLabels(lang);
  const rows = useMemo(
    () => buildScannerRows(symbolsList, currentSymbol, marketStatus, analysisResult, labels),
    [symbolsList, currentSymbol, marketStatus, analysisResult, labels]
  );
  const activeRows = rows.filter((row) => row.side === "long" || row.side === "short").length;
  const defenseRows = rows.filter((row) => row.side === "defense").length;
  const avgScore = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
    : 0;

  return (
    <aside
      className="relative z-20 hidden h-full shrink-0 overflow-visible xl:block"
      style={{
        width: collapsed ? 0 : 248,
        transition: "width 520ms cubic-bezier(0.22, 1, 0.36, 1)"
      }}
    >
      <div
        className={`absolute inset-y-0 left-0 flex w-[248px] flex-col border-r border-slate-800 bg-slate-950 text-slate-200 shadow-[18px_0_40px_rgba(2,6,23,0.26)] transition-[transform,opacity,filter] duration-500 ${
          collapsed ? "pointer-events-none -translate-x-5 opacity-0 blur-[1px]" : "translate-x-0 opacity-100 blur-0"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="border-b border-slate-800 p-2.5">
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                <Radar className="h-3.5 w-3.5" />
                MSIR Scanner
              </div>
              <div className="mt-1 truncate text-[9px] uppercase tracking-widest text-slate-600">
                {labels.subtitle}
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <ScannerMetric icon={<Zap className="h-3 w-3" />} label={labels.active} value={String(activeRows)} tone="text-cyan-300" />
            <ScannerMetric icon={<ShieldAlert className="h-3 w-3" />} label={labels.defense} value={String(defenseRows)} tone="text-amber-300" />
            <ScannerMetric icon={<Activity className="h-3 w-3" />} label={labels.score} value={String(avgScore)} tone="text-emerald-300" />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_42px_44px] gap-2 border-b border-slate-900 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-600">
          <span>{labels.asset}</span>
          <span className="text-right">{labels.bias}</span>
          <span className="text-right">{labels.rank}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-900">
          {rows.map((row) => {
            const selected = row.symbol.id === currentSymbol.id;
            return (
              <button
                key={row.symbol.id}
                type="button"
                onClick={() => onSymbolSelect(row.symbol)}
                className={`grid h-[54px] w-full grid-cols-[minmax(0,1fr)_42px_44px] items-center gap-2 px-2.5 text-left transition-colors focus:outline-none focus-visible:bg-slate-900 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan-400/60 ${
                  selected
                    ? "border-l-2 border-cyan-400 bg-slate-900 text-white"
                    : "border-l-2 border-transparent text-slate-300 hover:bg-slate-900/70 hover:text-white"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Crosshair className={`h-3 w-3 shrink-0 ${sideTone(row.side)}`} />
                    <span className="truncate text-[11px] font-black">{row.symbol.id}</span>
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <span className={`shrink-0 rounded border px-1 py-[1px] text-[7px] font-black uppercase tracking-wider ${setupTone(row.side)}`}>
                      {row.setup}
                    </span>
                    <span className="truncate text-[8px] text-slate-600">{row.source}</span>
                  </div>
                </div>
                <span className={`text-right text-[9px] font-black uppercase ${sideTone(row.side)}`}>{labels.side[row.side]}</span>
                <div className="text-right">
                  <div className={`font-mono text-[12px] font-black ${scoreTone(row.score)}`}>{row.score}</div>
                  <div className="text-[7px] uppercase tracking-wider text-slate-600">{row.risk}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t border-slate-900 p-2.5">
          <div className="rounded border border-cyan-500/15 bg-cyan-950/10 p-2">
            <div className="flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
              <span>{labels.focus}</span>
              <span className={marketStatus?.state === "live" ? "text-emerald-300" : "text-amber-300"}>
                {marketStatus?.state || "SIM"}
              </span>
            </div>
            <div className="mt-1 truncate text-[11px] font-black text-slate-100">{currentSymbol.id}</div>
            <div className="mt-1 text-[9px] leading-relaxed text-slate-500">{labels.footer}</div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        onPointerEnter={() => onHandleHoverChange?.(true)}
        onPointerLeave={() => onHandleHoverChange?.(false)}
        onMouseEnter={() => onHandleHoverChange?.(true)}
        onMouseLeave={() => onHandleHoverChange?.(false)}
        onFocus={() => onHandleHoverChange?.(true)}
        onBlur={() => onHandleHoverChange?.(false)}
        aria-expanded={!collapsed}
        className={`absolute top-[2.75rem] z-30 flex h-9 w-7 items-center justify-center border border-cyan-400/10 bg-slate-950/20 text-transparent shadow-none backdrop-blur transition-[left,color,border-color,background-color,box-shadow,transform] delay-[80ms] duration-200 hover:border-cyan-400/70 hover:bg-slate-900 hover:text-cyan-300 hover:shadow-[0_0_34px_rgba(34,211,238,0.28)] focus:outline-none focus-visible:border-cyan-300 focus-visible:text-cyan-300 focus-visible:ring-1 focus-visible:ring-cyan-300/70 ${
          collapsed ? "left-2 rounded-md" : "left-[246px] rounded-md"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        title={collapsed ? labels.expand : labels.collapse}
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform duration-500 ${collapsed ? "rotate-0" : "rotate-180"}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </button>
    </aside>
  );
}

function ScannerMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/50 px-1.5 py-1.5">
      <div className="flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-slate-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 font-mono text-[13px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function buildScannerRows(
  symbols: MarketSymbol[],
  currentSymbol: MarketSymbol,
  marketStatus: MarketDataStatus | undefined,
  analysisResult: AnalysisRunResponse | null | undefined,
  labels: ReturnType<typeof getLabels>
): ScannerRow[] {
  return symbols.slice(0, 24).map((symbol) => {
    const selected = symbol.id === currentSymbol.id;
    const changeScore = clamp(50 + symbol.change24h * 6, 8, 92);
    const volumeScore = clamp(Math.log10(Math.max(symbol.volume24h, 1)) * 5, 8, 35);
    const liveBonus = symbol.dataProvider === "binance" || symbol.lastDataState === "live" ? 6 : 0;
    const analysisBonus = selected ? selectedAnalysisBonus(analysisResult) : 0;
    const score = Math.round(clamp(changeScore * 0.72 + volumeScore + liveBonus + analysisBonus, 1, 99));
    const side = inferSide(symbol.change24h, score, selected ? analysisResult : null);
    const setup = inferSetup(symbol.change24h, score, side, labels);
    const risk = inferRisk(symbol, selected ? marketStatus : undefined, labels);
    return {
      symbol,
      score,
      side,
      setup,
      risk,
      source: symbol.lastSource || symbol.dataProvider || symbol.exchange || symbol.type
    };
  }).sort((a, b) => b.score - a.score);
}

function selectedAnalysisBonus(result?: AnalysisRunResponse | null) {
  if (!result) return 0;
  const trendBonus = result.trend === "bullish" ? 8 : result.trend === "bearish" ? -4 : 0;
  const permissionBonus = result.tradePermission?.allowed ? 6 : result.tradePermission ? -8 : 0;
  return trendBonus + permissionBonus + Math.round((result.confidence - 50) / 8);
}

function inferSide(change: number, score: number, result?: AnalysisRunResponse | null): ScannerSide {
  if (result?.tradePermission?.mode === "reject" || result?.tradePermission?.mode === "reduce_only") return "defense";
  if (result?.trend === "bearish") return score > 62 ? "short" : "defense";
  if (score >= 70 && change >= 0) return "long";
  if (score >= 64 && change < 0) return "short";
  if (Math.abs(change) > 4.5) return "defense";
  return "watch";
}

function inferSetup(change: number, score: number, side: ScannerSide, labels: ReturnType<typeof getLabels>) {
  if (side === "defense") return labels.setup.defense;
  if (score > 76 && change > 2) return labels.setup.breakout;
  if (score > 68 && change < 0) return labels.setup.reversal;
  if (score > 64) return labels.setup.momentum;
  return labels.setup.observe;
}

function inferRisk(symbol: MarketSymbol, status: MarketDataStatus | undefined, labels: ReturnType<typeof getLabels>) {
  if (status?.state === "stale" || status?.state === "error") return labels.risk.feed;
  if (symbol.lastDataState === "delayed" || symbol.dataProvider === "yahoo") return labels.risk.delay;
  if (Math.abs(symbol.change24h) > 5) return labels.risk.stress;
  return labels.risk.normal;
}

function getLabels(lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  return {
    subtitle: zh ? "策略扫描 / 信号矩阵" : "Strategy scan / signal matrix",
    active: zh ? "机会" : "Active",
    defense: zh ? "防御" : "Defense",
    score: zh ? "均分" : "Score",
    asset: zh ? "标的" : "Asset",
    bias: zh ? "偏向" : "Bias",
    rank: zh ? "评分" : "Rank",
    focus: zh ? "当前焦点" : "Active focus",
    footer: zh ? "第一阶段为前端扫描骨架；下一阶段接入 DGWM 分数。" : "Phase one scanner shell; DGWM scoring connects next.",
    collapse: zh ? "收起扫描器" : "Collapse scanner",
    expand: zh ? "展开扫描器" : "Expand scanner",
    side: {
      long: zh ? "多" : "Long",
      short: zh ? "空" : "Short",
      watch: zh ? "等" : "Watch",
      defense: zh ? "守" : "Def"
    },
    setup: {
      breakout: zh ? "突破" : "Break",
      reversal: zh ? "反转" : "Revert",
      momentum: zh ? "动量" : "Momentum",
      defense: zh ? "防御" : "Defense",
      observe: zh ? "观察" : "Observe"
    },
    risk: {
      normal: zh ? "OK" : "OK",
      delay: zh ? "DELAY" : "DELAY",
      feed: zh ? "FEED" : "FEED",
      stress: zh ? "STRESS" : "STRESS"
    }
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sideTone(side: ScannerSide) {
  if (side === "long") return "text-emerald-300";
  if (side === "short") return "text-rose-300";
  if (side === "defense") return "text-amber-300";
  return "text-slate-400";
}

function setupTone(side: ScannerSide) {
  if (side === "long") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (side === "short") return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  if (side === "defense") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-slate-700 bg-slate-900 text-slate-400";
}

function scoreTone(score: number) {
  if (score >= 74) return "text-emerald-300";
  if (score >= 62) return "text-cyan-300";
  if (score <= 38) return "text-rose-300";
  return "text-slate-300";
}
