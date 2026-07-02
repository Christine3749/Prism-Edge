import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Crown, ExternalLink, LogIn, LogOut, Settings, ShieldCheck, UserCircle } from "lucide-react";
import { readHsAccessToken } from "../../../shared/src/hsAuth";
import {
  HsMembershipSnapshot,
  loadMembershipSnapshot,
  membershipIsActive,
  membershipPlanLabel
} from "../../../shared/src/membership";
import type { Language } from "../../../shared/src/translations";

interface HeaderAccountMenuProps {
  lang: Language;
  onOpenSettings: () => void;
}

export function HeaderAccountMenu({ lang, onOpenSettings }: HeaderAccountMenuProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const account = useMemo(() => readAccountSnapshot(), []);
  const isSignedIn = Boolean(account.token);
  const [membership, setMembership] = useState<HsMembershipSnapshot | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const signedOutLabel = lang === "en" ? "Sign In" : lang === "tc" ? "登入" : "登录";
  const checkingLabel = lang === "en" ? "Checking" : lang === "tc" ? "校驗中" : "校验中";
  const accountLabel = isSignedIn
    ? (membershipLoading ? checkingLabel : membershipPlanLabel(membership, true, lang))
    : signedOutLabel;
  const accountTone = getAccountTone(membership, isSignedIn);
  const membershipUrl = "/membership";
  const loginUrl = "/login";

  useEffect(() => {
    if (!isSignedIn) {
      setMembership(null);
      setMembershipLoading(false);
      return;
    }

    const controller = new AbortController();
    setMembershipLoading(true);
    loadMembershipSnapshot(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setMembership(result.snapshot);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMembershipLoading(false);
      });

    return () => controller.abort();
  }, [account.token, isSignedIn]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative shrink-0" ref={accountMenuRef}>
      <button
        onClick={() => {
          if (!isSignedIn) {
            window.location.href = loginUrl;
            return;
          }
          setAccountMenuOpen((open) => !open);
        }}
        className={`h-7 flex items-center gap-1.5 px-2 border rounded text-[11px] font-bold cursor-pointer transition-all ${
          isSignedIn
            ? accountTone.button
            : "bg-[#031426] border-[#12324a] text-slate-300 hover:bg-[#06213a] hover:text-white hover:border-blue-600/35"
        }`}
        title={isSignedIn ? "MSIR Prism membership" : "Sign in to MSIR Prism"}
        aria-haspopup={isSignedIn ? "menu" : undefined}
        aria-expanded={isSignedIn ? accountMenuOpen : undefined}
      >
        {isSignedIn ? <Crown className={`h-3.5 w-3.5 ${accountTone.icon}`} /> : <LogIn className="h-3.5 w-3.5 text-blue-300/75" />}
        <span className="hidden sm:inline">{accountLabel}</span>
        {isSignedIn ? <ChevronDown className="h-3 w-3 text-blue-300/70" /> : <ExternalLink className="h-3 w-3 text-slate-500" />}
      </button>

      {isSignedIn && accountMenuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-[80] w-64 overflow-hidden rounded border border-[#1d4d6d]/80 bg-[#000814]/98 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="border-b border-[#12324a] bg-[#031426]/82 px-3 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-600/35 bg-[#071f36]/40 text-blue-300/70">
                <UserCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-slate-100">
                  {account.email || (lang === "en" ? "MSIR Prism Account" : lang === "tc" ? "MSIR Prism 帳號" : "MSIR Prism 账号")}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-blue-300/70">
                  <ShieldCheck className="h-3 w-3" />
                  MSIR Prism · {isSignedIn ? accountLabel : "Guest"}
                </div>
              </div>
            </div>
          </div>

          <div className="py-1.5">
            <AccountMenuLink href={membershipUrl} icon={<Crown className="h-3.5 w-3.5" />} label={lang === "en" ? "MSIR Prism Membership" : lang === "tc" ? "MSIR Prism 會員中心" : "MSIR Prism 会员中心"} />
            <AccountMenuButton
              icon={<Settings className="h-3.5 w-3.5" />}
              label={lang === "en" ? "Account & System Settings" : lang === "tc" ? "账号与系统设置" : "账户与系统设置"}
              onClick={() => {
                setAccountMenuOpen(false);
                onOpenSettings();
              }}
            />
            <AccountMenuButton
              icon={<LogOut className="h-3.5 w-3.5" />}
              label={lang === "en" ? "Sign out" : lang === "tc" ? "退出登入" : "退出登录"}
              onClick={() => {
                clearHsSession();
                setAccountMenuOpen(false);
                window.location.reload();
              }}
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AccountMenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      role="menuitem"
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-slate-300 no-underline transition-colors hover:bg-[#031426] hover:text-white"
    >
      <span className="text-blue-300/75">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function AccountMenuButton({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium transition-colors ${danger ? "text-rose-300 hover:bg-rose-950/30 hover:text-rose-200" : "text-slate-300 hover:bg-[#031426] hover:text-white"}`}
    >
      <span className={danger ? "text-rose-300" : "text-blue-300/75"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function getAccountTone(snapshot: HsMembershipSnapshot | null, signedIn: boolean) {
  if (!signedIn) return { button: "", icon: "text-blue-300/75" };
  if (!membershipIsActive(snapshot)) {
    return {
      button: "bg-[#031426] border-amber-500/35 text-amber-200 hover:bg-amber-950/20 hover:border-amber-400/50",
      icon: "text-amber-300"
    };
  }

  const planCode = snapshot?.subscription?.planCode?.toLowerCase().replace(/-/g, "_");
  if (planCode === "quant_pro" || planCode === "professional" || planCode === "pro") {
    return {
      button: "bg-[#031426] border-amber-500/35 text-amber-200 hover:bg-amber-950/20 hover:border-amber-400/50",
      icon: "text-amber-300"
    };
  }

  return {
    button: "bg-[#031426] border-[#12324a] text-blue-300/70 hover:bg-[#06213a] hover:border-blue-600/35",
    icon: "text-blue-300/70"
  };
}

function readAccountSnapshot() {
  const token = readHsAccessToken();
  const payload = decodeJwtPayload(token);
  return { token, email: typeof payload?.email === "string" ? payload.email : "" };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function clearHsSession() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (key === "hs_access_token" || key === "halfsphere_access_token" || (key.startsWith("sb-") && key.endsWith("-auth-token"))) {
        storage.removeItem(key);
      }
    }
  }
}