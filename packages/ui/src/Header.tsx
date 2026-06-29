import React, { useEffect, useMemo, useRef, useState } from "react";
import { 
  TrendingUp, BarChart2, Eye, Layout,
  Camera, Bookmark, RefreshCw, Menu, Globe,
  ChevronDown, Crown, ExternalLink, LogIn, LogOut, Settings, ShieldCheck, UserCircle
} from "lucide-react";
import { MarketSymbol, AppSettings, MarketDataStatus } from "../../shared/src/types";
import { Language, useTranslation } from "../../shared/src/translations";
import { describeMarketStatus } from "../../shared/src/marketStatus";
import { readHsAccessToken } from "../../shared/src/hsAuth";
import {
  HsMembershipSnapshot,
  loadMembershipSnapshot,
  membershipIsActive,
  membershipPlanLabel
} from "../../shared/src/membership";
import Logo from "./Logo";
import { SymbolSearch } from "./header/SymbolSearch";

interface HeaderProps {
  currentSymbol: MarketSymbol;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  currentTimeframe: string;
  onTimeframeSelect: (tf: string) => void;
  chartType: string;
  onChartTypeSelect: (type: string) => void;
  settings: AppSettings;
  onOpenSettings: () => void;
  onOpenIndicators: () => void;
  onSaveWorkspace: () => void;
  workspaceSaved: boolean;
  onResetLayout: () => void;
  onTakeScreenshot: () => void;
  isLiveBinanceActive: boolean;
  marketStatus?: MarketDataStatus;
  lang: Language;
  onLangChange: (lang: Language) => void;
  // Mobile responsive helper states
  onToggleWatchlist?: () => void;
}

export default function Header({
  currentSymbol,
  onSymbolSelect,
  currentTimeframe,
  onTimeframeSelect,
  chartType,
  onChartTypeSelect,
  settings,
  onOpenSettings,
  onOpenIndicators,
  onSaveWorkspace,
  workspaceSaved,
  onResetLayout,
  onTakeScreenshot,
  isLiveBinanceActive,
  marketStatus,
  lang,
  onLangChange,
  onToggleWatchlist
}: HeaderProps) {
  const t = useTranslation(lang);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1D", "1W", "1M"];
  const chartTypes = [
    { label: "Candle", value: "candlestick", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { label: "Line", value: "line", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { label: "Area", value: "area", icon: <Layout className="h-3.5 w-3.5" /> },
    { label: "Bars", value: "bars", icon: <BarChart2 className="h-3.5 w-3.5" /> }
  ];

  const feedState = marketStatus?.state || (isLiveBinanceActive ? "live" : "simulated");
  const displayMarketStatus: MarketDataStatus = marketStatus || {
    state: feedState,
    source: isLiveBinanceActive ? "binance" : "gateway",
    provider: currentSymbol.exchange || currentSymbol.market,
    updatedAt: currentSymbol.lastUpdatedAt,
    reason: isLiveBinanceActive ? "Realtime market feed is active." : "Market gateway status is being resolved."
  };
  const feedMeta = describeMarketStatus(displayMarketStatus, lang);
  const feedLabel = feedMeta.shortLabel;
  const feedClass = {
    loading: "bg-sky-950/40 border-sky-800/60 text-sky-400",
    live: "bg-teal-950/40 border-teal-800/60 text-teal-400",
    delayed: "bg-blue-950/40 border-blue-800/60 text-blue-300",
    simulated: "bg-amber-950/40 border-amber-800/60 text-amber-300",
    stale: "bg-orange-950/40 border-orange-800/60 text-orange-300",
    error: "bg-rose-950/40 border-rose-800/60 text-rose-400"
  }[feedState];
  const dotClass = {
    loading: "bg-sky-400 animate-pulse",
    live: "bg-teal-400 animate-pulse",
    delayed: "bg-blue-300",
    simulated: "bg-amber-300",
    stale: "bg-orange-300",
    error: "bg-rose-400"
  }[feedState];
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
    <header className="h-12 shrink-0 border-b border-slate-800 bg-slate-950 px-2.5 md:px-3 flex items-center gap-2 text-slate-200 select-none z-50 relative overflow-visible">
      {/* 1. Brand Logo & Name */}
      <div className="hidden sm:flex w-[190px] min-w-[170px] shrink-0 items-center">
        <Logo showText={true} className="h-8 shrink-0" />
      </div>

      {/* 2. Controls Area (Scrollable/Wrap on Mobile, Spaced on Desktop) */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth justify-start">
        
        <SymbolSearch currentSymbol={currentSymbol} onSymbolSelect={onSymbolSelect} t={t} />

        {/* Live Status indicator */}
        <div className="shrink-0 flex">
          <div
            className={`h-7 flex items-center gap-1 px-2 border rounded-full ${feedClass}`}
            title={feedMeta.tooltip}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`}></span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest hidden lg:inline">{feedLabel}</span>
            <span className="hidden xl:inline rounded-sm border border-current/20 bg-slate-950/40 px-1 text-[8px] font-mono font-black uppercase tracking-widest">{feedMeta.confidenceLabel}</span>
            <span className="hidden 2xl:inline text-[8px] font-mono font-bold uppercase tracking-widest opacity-60">{displayMarketStatus.source}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-800 shrink-0 mx-1 hidden sm:block"></div>

        {/* Timeframe Slider tab (Horizontal scroll adapts for narrow views) */}
        <div className="h-7 flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 shrink-0" id="timeframe_selector_group">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeSelect(tf)}
              className={`h-5 min-w-6 px-1.5 text-[10px] rounded transition-all font-mono font-bold cursor-pointer ${
                currentTimeframe === tf
                  ? "bg-cyan-500 text-slate-950 font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-800 shrink-0 mx-1 hidden md:block"></div>

        {/* Chart Style Switcher */}
        <div className="hidden md:flex h-7 items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800 shrink-0">
          {chartTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onChartTypeSelect(type.value)}
              className={`h-5 min-w-6 px-1.5 flex items-center justify-center gap-1.5 text-[11px] rounded transition-all font-medium cursor-pointer ${
                chartType === type.value
                  ? "bg-slate-800 text-cyan-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title={type.label}
            >
              {type.icon}
              <span className="hidden xl:inline">{type.label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-800 shrink-0 mx-1 hidden lg:block"></div>

        {/* Technical Indicators Toggle */}
        <button
          onClick={onOpenIndicators}
          className="hidden lg:flex h-7 items-center gap-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[11px] font-semibold hover:text-white cursor-pointer transition-all shrink-0"
          id="indicators_btn"
        >
          <Eye className="h-3.5 w-3.5 text-cyan-400" />
          <span>{t("techIndicators")}</span>
        </button>
      </div>

      {/* 3. Action Utilities (Desktop vs Mobile layout) */}
      <div className="flex items-center gap-1.5 shrink-0">
        
        {/* Watchlist toggle for mobile/tablet screens */}
        {onToggleWatchlist && (
          <button
            onClick={onToggleWatchlist}
            className="h-7 w-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 rounded text-cyan-400 md:hidden cursor-pointer transition-all"
            title="Toggle Watchlist Drawer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Indicator modal trigger for tablet (under lg) */}
        <button
          onClick={onOpenIndicators}
          className="lg:hidden h-7 w-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-all"
          title={t("techIndicators")}
        >
          <Eye className="h-4 w-4 text-cyan-400" />
        </button>

        {/* Workspace Save */}
        <button
          onClick={onSaveWorkspace}
          className={`h-7 flex items-center gap-1 px-2 border rounded text-[11px] font-bold cursor-pointer transition-all shrink-0 ${
            workspaceSaved 
              ? "bg-cyan-950 text-cyan-400 border-cyan-800" 
              : "bg-slate-900 hover:bg-slate-800 stroke-slate-300 border-slate-800 hover:text-white"
          }`}
          title={t("saveLayout")}
        >
          <Bookmark className={`h-3 w-3 md:h-3.5 md:w-3.5 ${workspaceSaved ? "fill-cyan-400 text-cyan-400" : ""}`} />
          <span className="hidden xl:inline">{workspaceSaved ? t("saved") : t("saveLayout")}</span>
        </button>

        {/* Reset workspace layout */}
        <button
          onClick={onResetLayout}
          className="hidden sm:flex h-7 w-7 items-center justify-center bg-slate-900 hover:bg-rose-950/20 hover:text-rose-400 border border-slate-800 rounded text-slate-400 cursor-pointer transition-all shrink-0"
          title={t("resetDashboard")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        {/* Take rapid screenshot */}
        <button
          onClick={onTakeScreenshot}
          className="hidden sm:flex h-7 w-7 items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-all shrink-0"
          title={t("exportSnapshot")}
        >
          <Camera className="h-3.5 w-3.5 text-sky-400" />
        </button>

        {/* Account / membership entry */}
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
                : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-cyan-500/40"
            }`}
            title={isSignedIn ? "MSIR Prism membership" : "Sign in to MSIR Prism"}
            aria-haspopup={isSignedIn ? "menu" : undefined}
            aria-expanded={isSignedIn ? accountMenuOpen : undefined}
          >
            {isSignedIn ? <Crown className={`h-3.5 w-3.5 ${accountTone.icon}`} /> : <LogIn className="h-3.5 w-3.5 text-cyan-400" />}
            <span className="hidden sm:inline">{accountLabel}</span>
            {isSignedIn ? <ChevronDown className="h-3 w-3 text-cyan-300/80" /> : <ExternalLink className="h-3 w-3 text-slate-500" />}
          </button>

          {isSignedIn && accountMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-9 z-[80] w-64 overflow-hidden rounded border border-slate-700/80 bg-slate-950/98 shadow-2xl shadow-black/40 backdrop-blur"
            >
              <div className="border-b border-slate-800 bg-slate-900/70 px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-950/30 text-cyan-300">
                    <UserCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-slate-100">
                      {account.email || (lang === "en" ? "MSIR Prism Account" : lang === "tc" ? "MSIR Prism 帳號" : "MSIR Prism 账号")}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-cyan-300">
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
        {/* Dynamic Globe Language Toggle Button */}
        <button
          onClick={() => {
            if (lang === "zh") onLangChange("en");
            else if (lang === "en") onLangChange("tc");
            else onLangChange("zh");
          }}
          className="h-7 flex items-center gap-1 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded text-[11px] font-bold text-cyan-400 cursor-pointer transition-all shrink-0"
          title="Switch Language / 切换语言"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="text-[10px] font-mono leading-none">
            {lang === "zh" ? "简" : lang === "tc" ? "繁" : "EN"}
          </span>
        </button>


      </div>
    </header>
  );
}
function AccountMenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      role="menuitem"
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-slate-300 no-underline transition-colors hover:bg-slate-900 hover:text-white"
    >
      <span className="text-cyan-400">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function AccountMenuButton({
  icon,
  label,
  onClick,
  danger = false
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium transition-colors ${
        danger
          ? "text-rose-300 hover:bg-rose-950/30 hover:text-rose-200"
          : "text-slate-300 hover:bg-slate-900 hover:text-white"
      }`}
    >
      <span className={danger ? "text-rose-300" : "text-cyan-400"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function getAccountTone(snapshot: HsMembershipSnapshot | null, signedIn: boolean) {
  if (!signedIn) {
    return { button: "", icon: "text-cyan-400" };
  }

  if (!membershipIsActive(snapshot)) {
    return {
      button: "bg-slate-900 border-amber-500/35 text-amber-200 hover:bg-amber-950/20 hover:border-amber-400/50",
      icon: "text-amber-300"
    };
  }

  const planCode = snapshot?.subscription?.planCode?.toLowerCase().replace(/-/g, "_");
  if (planCode === "quant_pro" || planCode === "professional" || planCode === "pro") {
    return {
      button: "bg-slate-900 border-amber-500/35 text-amber-200 hover:bg-amber-950/20 hover:border-amber-400/50",
      icon: "text-amber-300"
    };
  }

  return {
    button: "bg-slate-900 border-slate-800 text-cyan-300 hover:bg-slate-800 hover:border-cyan-500/40",
    icon: "text-cyan-300"
  };
}
function readAccountSnapshot() {
  const token = readHsAccessToken();
  const payload = decodeJwtPayload(token);
  return {
    token,
    email: typeof payload?.email === "string" ? payload.email : ""
  };
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


