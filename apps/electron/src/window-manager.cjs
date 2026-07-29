const { BrowserWindow, screen, shell } = require("electron");

const DEFAULT_BOUNDS = { width: 1440, height: 900 };
const MIN_BOUNDS = { width: 1080, height: 680 };

function createWindowManager({ app, store, getStartUrl, iconPath, preloadPath }) {
  let saveTimer = null;

  function getWindows() {
    return BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed());
  }

  function persistWindows() {
    const windows = getWindows().map(serializeWindow).filter(Boolean);
    store.setWindows(windows);
  }

  function schedulePersist() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persistWindows, 250);
  }

  function createWindow(savedState = {}) {
    const bounds = resolveBounds(savedState);
    const mainWindow = new BrowserWindow({
      ...bounds,
      minWidth: MIN_BOUNDS.width,
      minHeight: MIN_BOUNDS.height,
      backgroundColor: "#020617",
      autoHideMenuBar: true,
      show: false,
      title: "Prism-Edge",
      icon: iconPath,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        preload: preloadPath,
      },
    });

    mainWindow.once("ready-to-show", () => {
      if (savedState.isFullScreen) mainWindow.setFullScreen(true);
      else if (savedState.isMaximized) mainWindow.maximize();
      mainWindow.show();
    });

    mainWindow.on("move", schedulePersist);
    mainWindow.on("resize", schedulePersist);
    mainWindow.on("maximize", schedulePersist);
    mainWindow.on("unmaximize", schedulePersist);
    mainWindow.on("enter-full-screen", schedulePersist);
    mainWindow.on("leave-full-screen", schedulePersist);
    mainWindow.on("closed", () => setTimeout(persistWindows, 0));

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      openExternalIfAllowed(shell, url);
      return { action: "deny" };
    });

    const handleNavigation = (event, url) => {
      const startUrl = getStartUrl();
      const isAppNavigation = isTrustedAppNavigation(url, startUrl);
      if (!isAppNavigation) {
        event.preventDefault();
        openExternalIfAllowed(shell, url);
      }
    };

    mainWindow.webContents.on("will-navigate", handleNavigation);
    mainWindow.webContents.on("will-redirect", handleNavigation);

    mainWindow.loadURL(getStartUrl());
    return mainWindow;
  }

  function createWindowOnNextDisplay() {
    const displays = screen.getAllDisplays();
    const focused = BrowserWindow.getFocusedWindow();
    const currentDisplay = focused ? screen.getDisplayMatching(focused.getBounds()) : screen.getPrimaryDisplay();
    const index = displays.findIndex((display) => display.id === currentDisplay.id);
    const nextDisplay = displays[(index + 1 + displays.length) % displays.length] || currentDisplay;
    return createWindow({ displayId: nextDisplay.id });
  }

  function restoreWindows() {
    const savedWindows = store.getWindows();
    if (!savedWindows.length) {
      createWindow();
      return;
    }
    savedWindows.forEach((savedWindow) => createWindow(savedWindow));
  }

  function serializeWindow(win) {
    if (win.isDestroyed()) return null;
    const bounds = win.getNormalBounds();
    const display = screen.getDisplayMatching(bounds);
    return {
      bounds,
      displayId: display.id,
      isMaximized: win.isMaximized(),
      isFullScreen: win.isFullScreen(),
    };
  }

  app.on("browser-window-focus", schedulePersist);

  return { createWindow, createWindowOnNextDisplay, getWindows, persistWindows, restoreWindows };
}

function resolveBounds(savedState) {
  const display = resolveDisplay(savedState.displayId, savedState.bounds);
  const base = savedState.bounds && typeof savedState.bounds === "object" ? savedState.bounds : centerBounds(display);
  return clampBoundsToDisplay(base, display);
}

function resolveDisplay(displayId, bounds) {
  const displays = screen.getAllDisplays();
  const byId = displays.find((display) => display.id === displayId);
  if (byId) return byId;
  if (bounds) return screen.getDisplayMatching(bounds);
  return screen.getPrimaryDisplay();
}

function centerBounds(display) {
  const area = display.workArea;
  return {
    width: Math.min(DEFAULT_BOUNDS.width, area.width),
    height: Math.min(DEFAULT_BOUNDS.height, area.height),
    x: Math.round(area.x + (area.width - Math.min(DEFAULT_BOUNDS.width, area.width)) / 2),
    y: Math.round(area.y + (area.height - Math.min(DEFAULT_BOUNDS.height, area.height)) / 2),
  };
}

function clampBoundsToDisplay(bounds, display) {
  const area = display.workArea;
  const width = clamp(Number(bounds.width) || DEFAULT_BOUNDS.width, MIN_BOUNDS.width, area.width);
  const height = clamp(Number(bounds.height) || DEFAULT_BOUNDS.height, MIN_BOUNDS.height, area.height);
  return {
    width,
    height,
    x: clamp(Number(bounds.x) || area.x, area.x, area.x + area.width - width),
    y: clamp(Number(bounds.y) || area.y, area.y, area.y + area.height - height),
  };
}

function clamp(value, min, max) {
  if (max < min) return max;
  return Math.max(min, Math.min(max, value));
}

function isTrustedAppNavigation(url, startUrl) {
  try {
    const target = new URL(url);
    if (target.protocol === "prism:") return target.host === "app";
    const start = new URL(startUrl);
    return target.origin === start.origin;
  } catch {
    return false;
  }
}

function openExternalIfAllowed(shell, url) {
  try {
    const protocol = new URL(url).protocol;
    if (protocol !== "https:" && protocol !== "http:" && protocol !== "mailto:") return;
    void shell.openExternal(url);
  } catch {
    // Ignore malformed or unsupported external URLs.
  }
}

module.exports = { createWindowManager };
