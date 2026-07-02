import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "./MembershipPageTone";
import type { MembershipTone } from "./MembershipPageTone";

export function GuestPanel({ tone }: { tone: MembershipTone }) {
  return (
    <div className={cn("grid gap-4 rounded border p-6 lg:grid-cols-[1fr_auto] lg:items-center", tone.panel)}>
      <div>
        <div className={cn("text-lg font-black", tone.title)}>请先登录 MSIR Prism</div>
        <p className={cn("mt-2 max-w-2xl text-sm leading-6", tone.muted)}>
          登录后可以查看你的方案等级、量化权限和模型额度。普通会员不会进入内部运营后台。
        </p>
      </div>
      <a href="/login" className={cn("flex h-10 items-center justify-center rounded border px-4 text-sm font-black no-underline transition", tone.primaryButton)}>登录会员账号</a>
    </div>
  );
}

export function ErrorPanel({ tone, message }: { tone: MembershipTone; message: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between", tone.error)}>
      <span>{message}</span>
      <a href="/login" className={cn("shrink-0 rounded border px-3 py-1.5 text-xs font-black no-underline", tone.errorAction)}>重新登录</a>
    </div>
  );
}

export function SideItem({ tone, icon, label, active = false }: { tone: MembershipTone; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded px-3 py-2", active ? tone.sideActive : tone.sideIdle)}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

export function StatusPanel({ tone, title, value, meta, icon, accent }: { tone: MembershipTone; title: string; value: string; meta: string; icon: ReactNode; accent: "cyan" | "amber" | "slate" }) {
  return (
    <div className={cn("rounded border p-5", tone.panel)}>
      <div className={cn("mb-5 inline-flex h-9 w-9 items-center justify-center rounded border", tone.statusAccent[accent])}>{icon}</div>
      <div className={cn("text-[11px] font-bold uppercase tracking-[0.2em]", tone.subtle)}>{title}</div>
      <div className={cn("mt-2 text-xl font-black", tone.title)}>{value}</div>
      <div className={cn("mt-1 text-xs", tone.muted)}>{meta}</div>
    </div>
  );
}

export function PermissionCard({ tone, icon, title, detail, enabled }: { tone: MembershipTone; icon: ReactNode; title: string; detail: string; enabled: boolean }) {
  return (
    <div className={cn("flex items-start gap-3 rounded border p-4", tone.panel)}>
      <div className={enabled ? tone.enabledIcon : tone.disabledIcon}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className={cn("font-bold", tone.title)}>{title}</div>
          <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", enabled ? tone.enabledBadge : tone.lockedBadge)}>
            {enabled && <Check className="h-3 w-3" />}
            {enabled ? "Enabled" : "Locked"}
          </span>
        </div>
        <div className={cn("mt-1 text-xs", tone.muted)}>{detail}</div>
      </div>
    </div>
  );
}

export function InfoRow({ tone, label, value }: { tone: MembershipTone; label: string; value: string }) {
  return (
    <div className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[160px_1fr]">
      <div className={tone.muted}>{label}</div>
      <div className={cn("font-mono", tone.title)}>{value}</div>
    </div>
  );
}
