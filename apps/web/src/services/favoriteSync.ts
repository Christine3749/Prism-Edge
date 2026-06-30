import { hsFetch, readHsAccessToken } from "@shared/hsAuth";

const FAVORITE_SYMBOL_LIMIT = 500;

export function hasCloudFavoriteSession() {
  return Boolean(readHsAccessToken());
}

export function mergeFavoriteSymbols(...groups: string[][]) {
  const merged: string[] = [];
  const seen = new Set<string>();
  groups.flat().forEach((symbol) => {
    const normalized = normalizeFavoriteSymbol(symbol);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    merged.push(normalized);
  });
  return merged.slice(0, FAVORITE_SYMBOL_LIMIT);
}

export async function loadCloudFavoriteSymbols(signal?: AbortSignal) {
  if (!hasCloudFavoriteSession()) {
    return { signedIn: false, symbols: [] as string[] };
  }

  const response = await hsFetch("/api/watchlist/favorites", { signal });
  if (response.status === 401) {
    return { signedIn: false, symbols: [] as string[] };
  }
  if (!response.ok) {
    throw new Error(await readFavoriteSyncError(response, "Unable to load cloud favorites."));
  }

  const payload = await response.json();
  return {
    signedIn: true,
    symbols: normalizeFavoriteSymbols(payload?.symbols)
  };
}

export async function saveCloudFavoriteSymbols(symbols: string[], signal?: AbortSignal) {
  const normalized = normalizeFavoriteSymbols(symbols);
  if (!hasCloudFavoriteSession()) {
    return { signedIn: false, symbols: normalized };
  }

  const response = await hsFetch("/api/watchlist/favorites", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: normalized }),
    signal
  });

  if (response.status === 401) {
    return { signedIn: false, symbols: normalized };
  }
  if (!response.ok) {
    throw new Error(await readFavoriteSyncError(response, "Unable to save cloud favorites."));
  }

  const payload = await response.json();
  return {
    signedIn: true,
    symbols: normalizeFavoriteSymbols(payload?.symbols)
  };
}

export async function verifyCloudFavoriteSymbols(expectedSymbols: string[], signal?: AbortSignal) {
  const expected = mergeFavoriteSymbols(expectedSymbols);
  const cloud = await loadCloudFavoriteSymbols(signal);
  if (!cloud.signedIn) {
    return { signedIn: false, verified: false, symbols: expected };
  }
  return {
    signedIn: true,
    verified: sameFavoriteSymbols(expected, cloud.symbols),
    symbols: cloud.symbols
  };
}

function sameFavoriteSymbols(left: string[], right: string[]) {
  const normalizedLeft = mergeFavoriteSymbols(left).sort();
  const normalizedRight = mergeFavoriteSymbols(right).sort();
  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every((symbol, index) => symbol === normalizedRight[index]);
}
function normalizeFavoriteSymbols(value: unknown) {
  if (!Array.isArray(value)) return [];
  return mergeFavoriteSymbols(value.map((item) => String(item || "")));
}

function normalizeFavoriteSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\s+/g, "");
}

async function readFavoriteSyncError(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    return String(payload?.message || payload?.error || fallback);
  } catch {
    return fallback;
  }
}
