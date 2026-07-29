const { ipcMain } = require("electron");

function createSyncBus({ getWindows, store }) {
  let syncState = store.getSyncState();

  ipcMain.handle("desktop:get-state", () => syncState);

  ipcMain.on("desktop:symbol", (event, payload) => {
    const symbol = sanitizeSymbol(payload);
    if (!symbol) return;
    syncState = { ...syncState, symbol };
    store.setSyncState(syncState);
    broadcast(getWindows, "desktop:symbol", symbol, event.sender.id);
  });

  ipcMain.on("desktop:crosshair", (event, payload) => {
    const crosshair = sanitizeCrosshair(payload);
    if (!crosshair) return;
    syncState = { ...syncState, crosshair };
    broadcast(getWindows, "desktop:crosshair", crosshair, event.sender.id);
  });
}

function broadcast(getWindows, channel, payload, senderId) {
  getWindows().forEach((win) => {
    if (win.webContents.id === senderId || win.webContents.isDestroyed()) return;
    win.webContents.send(channel, payload);
  });
}

function sanitizeSymbol(payload) {
  if (!payload || typeof payload !== "object") return null;
  const id = String(payload.id || payload.symbol || "").trim();
  const symbol = String(payload.symbol || payload.id || "").trim();
  if (!id || !symbol) return null;
  return {
    id,
    symbol,
    name: String(payload.name || id),
    type: normalizeType(payload.type),
    market: payload.market ? String(payload.market) : undefined,
    exchange: payload.exchange ? String(payload.exchange) : undefined,
    currency: payload.currency ? String(payload.currency) : undefined,
    dataProvider: payload.dataProvider ? String(payload.dataProvider) : undefined,
    yahooSymbol: payload.yahooSymbol ? String(payload.yahooSymbol) : undefined,
    price: Number(payload.price) || 0,
    change24h: Number(payload.change24h) || 0,
    volume24h: Number(payload.volume24h) || 0,
    precision: Number.isFinite(Number(payload.precision)) ? Number(payload.precision) : 2,
    syncedAt: Date.now(),
  };
}

function sanitizeCrosshair(payload) {
  if (!payload || typeof payload !== "object") return null;
  const symbolId = String(payload.symbolId || "").trim();
  if (!symbolId) return null;
  const time = Number(payload.time);
  const price = Number(payload.price);
  return {
    symbolId,
    time: Number.isFinite(time) ? time : null,
    price: Number.isFinite(price) ? price : null,
    syncedAt: Date.now(),
  };
}

function normalizeType(type) {
  return type === "stock" || type === "forex" || type === "crypto" ? type : "stock";
}

module.exports = { createSyncBus };
