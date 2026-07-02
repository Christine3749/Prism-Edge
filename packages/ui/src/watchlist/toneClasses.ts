import type { PrismIntelligence } from "@shared/prismIntelligence";

export const feedToneMap = {
  live: "border-emerald-500/25 bg-emerald-500/20 text-emerald-300",
  delayed: "border-blue-500/20 bg-blue-500/10 text-blue-300/75",
  stale: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  error: "border-rose-500/20 bg-rose-500/10 text-rose-300",
  simulated: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  loading: "border-blue-500/30 bg-blue-500/10 text-blue-300/70"
};

export const feedLabelMap = {
  live: "LIVE",
  delayed: "DELAY",
  stale: "STALE",
  error: "ERR",
  simulated: "SIM",
  loading: "LOAD"
};

export function scoreTone(score: number) {
  if (score >= 74) return "text-emerald-300";
  if (score >= 62) return "text-blue-300/70";
  if (score <= 38) return "text-rose-300";
  return "text-slate-300";
}

export function scoreBar(score: number) {
  if (score >= 74) return "bg-emerald-300";
  if (score >= 62) return "bg-blue-500/25";
  if (score <= 38) return "bg-rose-300";
  return "bg-slate-500";
}

export function biasTone(bias: PrismIntelligence["bias"]) {
  if (bias === "long") return "text-emerald-300";
  if (bias === "short") return "text-rose-300";
  if (bias === "defense") return "text-amber-300";
  return "text-slate-400";
}
