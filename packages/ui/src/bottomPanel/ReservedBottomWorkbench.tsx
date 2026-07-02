import type { Language } from "../../../shared/src/translations";
import type { WorkspaceDeck } from "../SignalScanner";

export function ReservedBottomWorkbench({ deck, lang, theme }: { deck: WorkspaceDeck; lang: Language; theme: "dark" | "light" }) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const learningMode = deck === 5;
  const label = learningMode ? "V" : "VI";
  const title = learningMode
    ? zh ? "复盘与归因工作台" : "Learning & Attribution Workbench"
    : zh ? "元治理仲裁台" : "Meta-Governance Arbitration Desk";
  const subtitle = learningMode
    ? zh ? "把 IV 的成交结果和 DGWM 的当时判断放在一起，做低频校准。" : "Pair IV fills with DGWM decision snapshots for low-frequency calibration."
    : zh ? "悬在 I-V 之上，只做允许、否决、降级、冻结，不生成交易信号。" : "Sits above I-V; allows, vetoes, degrades, or freezes without generating trade signals.";
  const cards = learningMode
    ? [
        { label: zh ? "执行成交记录" : "Execution Records", value: "IV / PnL", note: zh ? "硬数据入口" : "hard-data input" },
        { label: zh ? "DGWM 决策快照" : "DGWM Snapshots", value: "II-IV", note: zh ? "软证据入口" : "soft-evidence input" },
        { label: zh ? "归因引擎" : "Attribution Engine", value: zh ? "盈亏归因" : "P/L cause", note: zh ? "核心决策层" : "core layer" },
        { label: zh ? "学习回灌" : "Learning Feedback", value: zh ? "每周" : "Weekly", note: "III / IV" }
      ]
    : [
        { label: "Ethan7586", value: zh ? "收敛验证" : "Convergent Check", note: zh ? "风险、敞口、历史可信度" : "risk, exposure, history" },
        { label: "Christine3749", value: zh ? "机会穿透" : "Opportunity Probe", note: zh ? "过度保守、错失机会" : "missed opportunity" },
        { label: zh ? "仲裁决策台" : "Arbitration Desk", value: zh ? "最终否决" : "Final Veto", note: zh ? "系统级闸门" : "system gate" },
        { label: zh ? "接入状态" : "Integration", value: zh ? "暂缓" : "Deferred", note: zh ? "等 V 样本足够" : "wait for V samples" }
      ];
  const lanes = learningMode
    ? [
        zh ? "单笔复盘：这一次为什么赢/输。" : "Trade review: why this one won or lost.",
        zh ? "策略校准：因子权重是否系统性偏差。" : "Strategy calibration: whether factor weights drifted.",
        zh ? "回灌节奏：批量、低频、可审计。" : "Feedback cadence: batched, low-frequency, auditable."
      ]
    : [
        zh ? "平时不插手 I-V 的正常流水线。" : "Does not interrupt the normal I-V pipeline.",
        zh ? "只有冲突、异常、过度自信或过度保守时介入。" : "Intervenes only on conflict, anomaly, overconfidence, or excess conservatism.",
        zh ? "真实双智能体接入先不施工。" : "Real dual-agent integration stays deferred."
      ];
  const flow = learningMode
    ? [zh ? "成交" : "Fills", zh ? "快照" : "Snapshot", zh ? "归因" : "Attribution", zh ? "校准" : "Calibration", zh ? "回灌" : "Feedback"]
    : ["I-V", "Ethan", "Christine", zh ? "仲裁" : "Arbitrate", zh ? "否决/放行" : "Veto/Allow"];

  return (
    <div className={`h-full min-h-[360px] overflow-y-auto px-6 py-5 ${dark ? "bg-[#06111f] text-slate-200" : "bg-[#f7fbff] text-[#102136]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-current/10 pb-4">
        <div className="min-w-0">
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
            <span>{label}</span>
            <span>/</span>
            <span>{learningMode ? zh ? "复盘归因" : "Attribution" : zh ? "元治理" : "Meta-Governance"}</span>
          </div>
          <h3 className="mt-2 text-[18px] font-black">{title}</h3>
          <p className={`mt-1 max-w-3xl text-[12px] leading-relaxed ${dark ? "text-slate-400" : "text-[#607188]"}`}>{subtitle}</p>
        </div>
        <div className={`shrink-0 border px-4 py-3 text-right font-mono ${dark ? "border-blue-300/20 bg-blue-300/8 text-blue-200" : "border-blue-600/20 bg-blue-50 text-blue-800"}`}>
          <div className="text-[22px] font-black">{learningMode ? "LOW FREQ" : "VETO"}</div>
          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">{learningMode ? "batch feedback" : "final gate"}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <section key={card.label} className={`border p-3 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
            <div className={`font-mono text-[9px] font-black uppercase tracking-[0.14em] ${dark ? "text-slate-500" : "text-[#718299]"}`}>{card.label}</div>
            <div className={`mt-2 text-[16px] font-black ${dark ? "text-slate-100" : "text-[#102136]"}`}>{card.value}</div>
            <div className={`mt-1 text-[10px] leading-relaxed ${dark ? "text-slate-500" : "text-[#607188]"}`}>{card.note}</div>
          </section>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className={`border p-4 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[14px] font-black">{learningMode ? zh ? "系统链路" : "System Flow" : zh ? "仲裁链路" : "Arbitration Flow"}</h4>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label} / {learningMode ? "LEARNING" : "GOVERNANCE"}</div>
          </div>
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {flow.map((item, index) => (
              <div key={`${item}-${index}`} className="flex shrink-0 items-center gap-2">
                <div className={`min-w-[92px] border px-3 py-3 text-center font-mono text-[10px] font-black uppercase tracking-[0.12em] ${index === 2 ? dark ? "border-blue-300/35 bg-blue-300/12 text-blue-100" : "border-blue-600/30 bg-blue-50 text-blue-800" : dark ? "border-white/10 bg-[#06101d] text-slate-400" : "border-[#d9e5f0] bg-[#fbfdff] text-[#607188]"}`}>{item}</div>
                {index < flow.length - 1 && <div className={dark ? "text-slate-600" : "text-slate-400"}>→</div>}
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            {lanes.map((item, index) => (
              <div key={item} className={`flex items-start gap-3 border px-3 py-2 ${dark ? "border-white/10 bg-[#06101d]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
                <div className={`font-mono text-[10px] font-black ${dark ? "text-blue-200" : "text-blue-700"}`}>0{index + 1}</div>
                <p className={`text-[11px] leading-relaxed ${dark ? "text-slate-300" : "text-[#28384d]"}`}>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`border p-4 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[14px] font-black">{learningMode ? zh ? "当前约束" : "Current Constraints" : zh ? "介入原则" : "Intervention Rules"}</h4>
            <span className={`border px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.12em] ${dark ? "border-amber-300/25 bg-amber-300/10 text-amber-200" : "border-amber-600/25 bg-amber-50 text-amber-800"}`}>{learningMode ? zh ? "非实时" : "not live" : zh ? "不施工" : "defer"}</span>
          </div>
          <div className="mt-4 grid gap-2">
            {(learningMode
              ? [zh ? "不根据一两笔交易改权重。" : "Do not retune weights from one or two trades.", zh ? "归因先区分运气和能力。" : "Attribution separates luck from skill first.", zh ? "回灌必须可追溯。" : "Every feedback write-back must be traceable."]
              : [zh ? "不替代 DGWM 或 Edge Control。" : "Does not replace DGWM or Edge Control.", zh ? "不做日常交易建议。" : "Does not produce routine trading advice.", zh ? "没有足够 V 样本前只保留架构。" : "Architecture only until V has enough samples."]
            ).map((item) => (
              <div key={item} className={`border px-3 py-2 text-[11px] leading-relaxed ${dark ? "border-white/10 bg-[#06101d] text-slate-300" : "border-[#d9e5f0] bg-[#fbfdff] text-[#28384d]"}`}>{item}</div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
