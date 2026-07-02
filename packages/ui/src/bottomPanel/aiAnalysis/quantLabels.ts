import type { Language } from "@shared/translations";

export function getQuantLabels(lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  return {
    structure: zh ? "市场结构" : "Structure",
    permission: zh ? "交易许可" : "Permission",
    netReward: zh ? "效用代理" : "Utility Proxy",
    error: zh ? "误差" : "EDG",
    gap: zh ? "谱间隙" : "Gap",
    allowed: zh ? "允许交易" : "Allowed",
    blocked: zh ? "需要降级/拒绝" : "Review or reject",
    riskReasons: zh ? "风险原因" : "Risk reasons",
    regime: {
      trend: zh ? "趋势" : "Trend",
      range: zh ? "震荡" : "Range",
      breakout: zh ? "突破" : "Breakout",
      stress: zh ? "压力" : "Stress",
      transition: zh ? "切换" : "Transition"
    },
    mode: {
      attack: zh ? "进攻" : "Attack",
      defensive: zh ? "防守" : "Defensive",
      reduce_only: zh ? "只减仓" : "Reduce only",
      hedge_only: zh ? "仅对冲" : "Hedge only",
      reject: zh ? "拒绝" : "Reject",
      manual_review: zh ? "人工复核" : "Manual review"
    }
  };
}