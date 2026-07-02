import type { PrismIntelligence } from "@shared/prismIntelligence";

export function scoreDeckShell(score: number) {
  if (score >= 74) return "border-emerald-400/30 bg-emerald-500/[0.06] shadow-[0_0_28px_rgba(16,185,129,0.08)]";
  if (score >= 62) return "border-blue-500/30 bg-blue-500/[0.07] shadow-[0_0_28px_rgba(54,96,130,0.04)]";
  if (score <= 38) return "border-rose-400/25 bg-rose-500/[0.06] shadow-[0_0_28px_rgba(244,63,94,0.08)]";
  return "border-[#12324a] bg-[#031426]/82";
}

export function scoreTone(score: number) {
  if (score >= 74) return "text-emerald-300";
  if (score >= 62) return "text-blue-300/70";
  if (score <= 38) return "text-rose-300";
  return "text-slate-300";
}

export function biasTone(bias: PrismIntelligence["bias"]) {
  if (bias === "long") return "text-emerald-300";
  if (bias === "short") return "text-rose-300";
  if (bias === "defense") return "text-amber-300";
  return "text-slate-400";
}

export function riskTone(risk: PrismIntelligence["risk"]) {
  if (risk === "normal") return "text-emerald-300";
  if (risk === "elevated") return "text-amber-300";
  if (risk === "stress") return "text-rose-300";
  return "text-orange-300";
}

export function clampDashboard(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function formatRatio(value?: number) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

export function formatSignedPercent(value: number) {
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

export function formatSignedOneDecimal(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}