export type PlatformType = "web" | "android" | "desktop_macos" | "desktop_windows";

export function getPlatformType(): PlatformType {
  // @ts-ignore
  if (window.__TAURI__) {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("mac") || userAgent.includes("os x")) {
      return "desktop_macos";
    }
    return "desktop_windows";
  }
  
  // @ts-ignore
  if (window.Capacitor && window.Capacitor.getPlatform() === "android") {
    return "android";
  }

  // Fallback to standard web
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("android")) {
    return "android";
  }

  return "web";
}

export function isMobilePlatform(): boolean {
  return getPlatformType() === "android";
}

export function isDesktopPlatform(): boolean {
  const p = getPlatformType();
  return p === "desktop_macos" || p === "desktop_windows";
}
