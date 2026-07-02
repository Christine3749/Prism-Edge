import type { EvidenceItem, IntelEvent } from "./types";

export function warScoreTone(score: number) {
  if (score >= 74) return "text-emerald-300";
  if (score >= 62) return "text-blue-300/70";
  if (score <= 38) return "text-rose-300";
  return "text-slate-300";
}

export function eventIconTone(tone: IntelEvent["tone"]) {
  if (tone === "cyan") return "text-blue-300/70";
  if (tone === "amber") return "text-amber-300";
  if (tone === "rose") return "text-rose-300";
  if (tone === "emerald") return "text-emerald-300";
  return "text-slate-500";
}

export function evidenceTone(tone: EvidenceItem["tone"]) {
  if (tone === "cyan") return "text-blue-300/70";
  if (tone === "amber") return "text-amber-300";
  if (tone === "rose") return "text-rose-300";
  if (tone === "emerald") return "text-emerald-300";
  return "text-slate-300";
}

export function evidenceBar(tone: EvidenceItem["tone"]) {
  if (tone === "cyan") return "bg-blue-500/25";
  if (tone === "amber") return "bg-amber-300";
  if (tone === "rose") return "bg-rose-300";
  if (tone === "emerald") return "bg-emerald-300";
  return "bg-slate-500";
}

export function eventTagTone(tone: IntelEvent["tone"]) {
  if (tone === "cyan") return "border-blue-500/25 bg-blue-500/25 text-blue-200/70";
  if (tone === "amber") return "border-amber-300/25 bg-amber-300/10 text-amber-200";
  if (tone === "rose") return "border-rose-300/25 bg-rose-300/10 text-rose-200";
  if (tone === "emerald") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  return "border-[#12324a] bg-[#000814] text-slate-400";
}
