const DRAW_KEY = "msir_prism_drawings_v2";
const INDICATOR_KEY = "msir_prism_indicators_v2";
const SETTING_KEY = "msir_prism_settings_v2";
const WATCH_KEY = "msir_prism_watchlist_v2";

export function loadItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch (e) {
    console.error(`Error loading key "${key}" from localStorage:`, e);
    return defaultValue;
  }
}

export function saveItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing key "${key}" to localStorage:`, e);
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`Error removing key "${key}" from localStorage:`, e);
  }
}

export const StorageService = {
  loadDrawings: (def: any) => loadItem(DRAW_KEY, def),
  saveDrawings: (val: any) => saveItem(DRAW_KEY, val),
  clearDrawings: () => removeItem(DRAW_KEY),

  loadIndicators: (def: any) => loadItem(INDICATOR_KEY, def),
  saveIndicators: (val: any) => saveItem(INDICATOR_KEY, val),
  clearIndicators: () => removeItem(INDICATOR_KEY),

  loadSettings: (def: any) => loadItem(SETTING_KEY, def),
  saveSettings: (val: any) => saveItem(SETTING_KEY, val),
  clearSettings: () => removeItem(SETTING_KEY),

  loadWatchlist: (def: any) => loadItem(WATCH_KEY, def),
  saveWatchlist: (val: any) => saveItem(WATCH_KEY, val),
  clearWatchlist: () => removeItem(WATCH_KEY),

  clearAll: () => {
    removeItem(DRAW_KEY);
    removeItem(INDICATOR_KEY);
    removeItem(SETTING_KEY);
    removeItem(WATCH_KEY);
  }
};
