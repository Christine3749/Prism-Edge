const { app, Menu } = require("electron");
const path = require("node:path");
const { createAppMenu } = require("./menu.cjs");
const { handleAppProtocol, registerPrivilegedScheme } = require("./protocol.cjs");
const { createSyncBus } = require("./sync-bus.cjs");
const { createWindowManager } = require("./window-manager.cjs");
const { createWorkspaceStore } = require("./workspace-store.cjs");

const APP_SCHEME = "prism";
const DEFAULT_DEV_URL = "http://localhost:3000";
const DEFAULT_PRODUCTION_URL = "https://msirprism.com";

registerPrivilegedScheme(APP_SCHEME);

function getDistDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, "dist");
  return path.resolve(__dirname, "..", "..", "..", "dist");
}

function getStartUrl() {
  if (process.env.PRISM_ELECTRON_URL) return process.env.PRISM_ELECTRON_URL;
  if (!app.isPackaged) return DEFAULT_DEV_URL;
  return DEFAULT_PRODUCTION_URL;
}

app.whenReady().then(() => {
  const store = createWorkspaceStore(app.getPath("userData"));
  handleAppProtocol({ scheme: APP_SCHEME, getDistDir });

  const windowManager = createWindowManager({
    app,
    store,
    getStartUrl,
    iconPath: path.join(__dirname, "..", "assets", "icon-256.png"),
    preloadPath: path.join(__dirname, "preload.cjs"),
  });

  createSyncBus({ getWindows: windowManager.getWindows, store });
  Menu.setApplicationMenu(createAppMenu(windowManager));

  app.on("web-contents-created", (_event, contents) => {
    contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
  });

  windowManager.restoreWindows();

  app.on("before-quit", () => windowManager.persistWindows());
  app.on("activate", () => {
    if (windowManager.getWindows().length === 0) windowManager.createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
