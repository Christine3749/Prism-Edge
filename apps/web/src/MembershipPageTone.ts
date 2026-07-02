export type MembershipTone = ReturnType<typeof buildMembershipTone>;

export function buildMembershipTone(light: boolean) {
  if (light) {
    return {
      page: "bg-[#f5f7fa] text-[#17202c]",
      grid: "rgba(95, 122, 146, 0.13)",
      border: "border-[#d8e1ea]",
      divide: "divide-[#d8e1ea]",
      panel: "border-[#d8e1ea] bg-[#f8fafc]",
      notice: "border-[#c5d6e5] bg-[#eef5fa]",
      logoBox: "border-[#bfd0df] bg-[#eef4f9] text-[#2f6f99]",
      iconBox: "border-[#bfd0df] bg-[#eef4f9] text-[#2f6f99]",
      title: "text-[#17202c]",
      muted: "text-[#667587]",
      subtle: "text-[#7b8a9c]",
      accent: "text-[#2f6f99]",
      primaryButton: "border-[#9fb8cc] bg-[#dceaf5] text-[#174f78] hover:bg-[#d2e2ef]",
      secondaryButton: "border-[#ccd9e5] bg-[#f8fafc] text-[#4d6074] hover:border-[#aebfd0] hover:bg-[#eef4f9]",
      sideActive: "bg-[#e8f0f7] text-[#174f78]",
      sideIdle: "text-[#738294] hover:bg-[#eef4f9] hover:text-[#26384d]",
      enabledIcon: "text-[#2f8c78]",
      disabledIcon: "text-[#9aa8b7]",
      enabledBadge: "border-[#a9d4c7] bg-[#eef8f5] text-[#14745f]",
      lockedBadge: "border-[#cbd8e5] bg-[#f2f5f8] text-[#7a8795]",
      error: "border-[#dec483] bg-[#fff8e4] text-[#76570a]",
      errorAction: "border-[#d3b46c] bg-[#fffdf4] text-[#6d5108] hover:bg-[#fff3c4]",
      statusAccent: {
        cyan: "border-[#afd1df] bg-[#edf7fa] text-[#2f6f99]",
        amber: "border-[#dfc875] bg-[#fff7d6] text-[#8a6504]",
        slate: "border-[#cbd8e5] bg-[#eef3f8] text-[#4d6074]"
      }
    };
  }

  return {
    page: "bg-[#000814] text-slate-100",
    grid: "rgba(47, 111, 153, 0.13)",
    border: "border-[#12324a]",
    divide: "divide-[#12324a]",
    panel: "border-[#12324a] bg-[#020b18]/92",
    notice: "border-[#1c5a73] bg-[#041725]/86",
    logoBox: "border-[#12324a] bg-[#031426] text-[#5fb2d4]",
    iconBox: "border-[#1d4d6d] bg-[#031426] text-[#5fb2d4]",
    title: "text-slate-100",
    muted: "text-slate-500",
    subtle: "text-slate-600",
    accent: "text-[#5fb2d4]",
    primaryButton: "border-[#2f6f99]/70 bg-[#06213a] text-[#b8d8ea] hover:bg-[#0b2a44] hover:text-white",
    secondaryButton: "border-[#12324a] bg-[#020b18] text-slate-400 hover:border-[#2f6f99]/70 hover:text-slate-100",
    sideActive: "bg-[#061a2b] text-[#5fb2d4]",
    sideIdle: "text-slate-500 hover:bg-[#031426] hover:text-slate-300",
    enabledIcon: "text-emerald-300",
    disabledIcon: "text-slate-700",
    enabledBadge: "border-emerald-300/30 bg-emerald-300/10 text-emerald-300",
    lockedBadge: "border-slate-700 bg-[#020b18] text-slate-500",
    error: "border-amber-500/30 bg-amber-950/15 text-amber-200",
    errorAction: "border-amber-500/30 bg-[#020b18] text-amber-200 hover:text-amber-100",
    statusAccent: {
      cyan: "border-[#2f6f99]/35 bg-[#06213a]/55 text-[#5fb2d4]",
      amber: "border-amber-400/30 bg-amber-950/15 text-amber-300",
      slate: "border-slate-700 bg-[#031426] text-slate-300"
    }
  };
}

export function normalizeMembershipError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("expired") || lower.includes("bad_jwt") || lower.includes("invalid jwt")) {
    return "登录状态已过期，请重新登录后再查看会员权限。";
  }
  if (lower.includes("missing") && lower.includes("token")) {
    return "请先登录 MSIR Prism，再查看会员权限。";
  }
  return message;
}

export function featureEnabled(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return ["true", "yes", "enabled"].includes(value.toLowerCase());
  return false;
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
