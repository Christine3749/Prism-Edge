const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, handler) {
  const listener = (_event, payload) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("prismDesktop", {
  runtime: "electron",
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
  getState: () => ipcRenderer.invoke("desktop:get-state"),
  publishSymbol: (payload) => ipcRenderer.send("desktop:symbol", payload),
  onSymbol: (handler) => subscribe("desktop:symbol", handler),
  publishCrosshair: (payload) => ipcRenderer.send("desktop:crosshair", payload),
  onCrosshair: (handler) => subscribe("desktop:crosshair", handler),
});
