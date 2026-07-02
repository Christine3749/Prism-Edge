import { Activity, Gauge, ShieldCheck } from "lucide-react";
import { MetricPill } from "./MetricPill";
import { workspaceDeckLabel } from "./workspaceDeckLabel";
import type { SignalScannerProps } from "./types";

export function ReservedWorkspaceSummary({
  deck,
  lang,
  theme
}: {
  deck: NonNullable<SignalScannerProps["activeWorkspaceDeck"]>;
  lang: SignalScannerProps["lang"];
  theme: NonNullable<SignalScannerProps["theme"]>;
}) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const learningMode = deck === 5;
  const title = learningMode
    ? zh ? "复盘与归因" : "Learning & Attribution"
    : zh ? "元治理仲裁" : "Meta-Governance";
  const headline = learningMode
    ? zh ? "把每次执行变成可校准的证据。" : "Turn every execution into calibration evidence."
    : zh ? "判断整套 I-V 系统现在是否可信。" : "Judge whether the I-V system is currently trustworthy.";
  const body = learningMode
    ? zh ? "V 读取执行成交与 DGWM 决策快照，分离单笔复盘和策略校准，低频回灌给 III/IV。" : "V reads fills and DGWM snapshots, separating trade review from strategy calibration before low-frequency feedback to III/IV."
    : zh ? "VI 悬在 I-V 之上，不产出信号，只在系统冲突、异常或过度自信时做允许、否决、降级或冻结。" : "VI sits above I-V, producing no signals; it allows, vetoes, degrades, or freezes the system when conflicts or anomalies appear.";
  const score = learningMode ? "73" : "WAIT";
  const metricRows = learningMode
    ? [
        [zh ? "硬数据" : "Hard Data", "PnL / fills"],
        [zh ? "软证据" : "Soft Evidence", "DGWM snap"],
        [zh ? "节奏" : "Cadence", zh ? "每周" : "Weekly"],
        [zh ? "回灌" : "Feedback", "III / IV"]
      ]
    : [
        [zh ? "左脑" : "Left Agent", "Ethan7586"],
        [zh ? "右脑" : "Right Agent", "Christine3749"],
        [zh ? "权限" : "Authority", zh ? "否决" : "Veto"],
        [zh ? "施工" : "Build", zh ? "暂缓" : "Deferred"]
      ];
  const steps = learningMode
    ? [
        zh ? "执行成交记录进入归因引擎。" : "Execution records enter attribution.",
        zh ? "DGWM 决策快照补足当时判断。" : "DGWM snapshots preserve the original judgment.",
        zh ? "单笔复盘和策略校准分开处理。" : "Trade review and strategy calibration stay separate.",
        zh ? "校准结果批量、低频回灌。" : "Calibration feeds back in low-frequency batches."
      ]
    : [
        zh ? "Ethan7586 负责收敛验证和风险泼冷水。" : "Ethan7586 performs convergent verification and risk checks.",
        zh ? "Christine3749 负责机会穿透和过度保守识别。" : "Christine3749 detects missed opportunities and excess conservatism.",
        zh ? "冲突时进入仲裁台，不日常插手。" : "Only conflicts enter arbitration; daily flow stays untouched.",
        zh ? "真实接入等 V 积累足够复盘样本。" : "Real integration waits for enough V-layer review samples."
      ];

  return (
    <div className={`flex h-full min-h-0 flex-col border-r ${dark ? "border-white/10 bg-[#07111f] text-slate-200" : "border-[#d9e5f0] bg-[#f7fbff] text-[#102136]"}`}>
      <div className={`border-b px-3 py-3 ${dark ? "border-white/10 bg-[#0a1626]" : "border-[#d9e5f0] bg-white"}`}>
        <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
          <Activity className="h-3.5 w-3.5" />
          {workspaceDeckLabel(deck)} / {title}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-[15px] font-black ${dark ? "text-white" : "text-[#102136]"}`}>{headline}</div>
            <p className={`mt-2 text-[10px] leading-relaxed ${dark ? "text-slate-400" : "text-[#607188]"}`}>{body}</p>
          </div>
          <div className={`shrink-0 text-right font-mono ${dark ? "text-blue-200" : "text-blue-700"}`}>
            <div className="text-[26px] font-black leading-none">{score}</div>
            <div className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-500">{learningMode ? "ATTR" : "ARB"}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section className={`border p-3 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
            <Gauge className="h-3.5 w-3.5" />
            {learningMode ? zh ? "复盘链路" : "Review Chain" : zh ? "仲裁边界" : "Arbitration Boundary"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[8px] font-black uppercase tracking-widest">
            {metricRows.map(([label, value]) => <MetricPill key={label} label={label} value={value} dark={dark} />)}
          </div>
        </section>

        <section className={`mt-3 border p-3 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-amber-300" : "text-amber-700"}`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {learningMode ? zh ? "学习约束" : "Learning Constraints" : zh ? "最高闸门" : "Final Gate"}
          </div>
          <div className="mt-2 space-y-2">
            {steps.map((item, index) => (
              <div key={item} className={`border px-2 py-2 ${dark ? "border-white/10 bg-[#06101d]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
                <div className={`font-mono text-[8px] font-black ${dark ? "text-blue-200/80" : "text-blue-700"}`}>0{index + 1}</div>
                <div className={`mt-0.5 text-[10px] leading-relaxed ${dark ? "text-slate-300" : "text-[#28384d]"}`}>{item}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
