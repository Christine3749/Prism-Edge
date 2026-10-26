import type { Express } from "express";
import { hsProductCode, getHsMembershipForRequest } from "./hsMembership";
import { isValidMarketSymbol, normalizeMarketSymbol } from "./marketFormat";
import { hsApiRequest } from "./hsApi";

const FAVORITE_SYMBOL_LIMIT = 500;

export function registerAuthRoutes(app: Express) {
  app.get("/api/membership/me", async (req, res) => {
    const result = await getHsMembershipForRequest(req);
    if (result.ok === false) return res.status(result.status).json(result.payload);
    return res.json(result.snapshot);
  });

  app.post("/api/auth/login", async (req, res) => {
    const email = String(req.body?.email || "").trim();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "INVALID_LOGIN_REQUEST", message: "Email and password are required." });
    }

    try {
      const payload = await hsApiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      return res.json({
        access_token: payload.idToken,
        refresh_token: payload.refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + Number(payload.expiresIn || 0),
        token_type: "bearer",
        user: payload.user ? { id: payload.user.id, email: payload.user.email } : null
      });
    } catch (error: any) {
      return res.status(error.status || 502).json({ error: error.code || "MSIR_LOGIN_FAILED", message: error.message || "MSIR Prism login failed." });
    }
  });

  app.post("/api/membership/activate-free", async (req, res) => {
    const token = readBearerTokenFromHeader(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "UNAUTHORIZED", message: "Please sign in before activating membership." });

    try {
      // The account RPC bridge exists; Prism activation is not yet exposed there.
      // Keep the existing operation and upstream error; never activate another product.
      const payload = await hsApiRequest("/gsyen/data/rest/v1/rpc/hs_activate_free_membership", {
        method: "POST",
        token,
        body: JSON.stringify({ target_product_code: hsProductCode() })
      });
      return res.json({ ok: true, membership: payload });
    } catch (error: any) {
      return res.status(error.status || 502).json({ error: error.code || "MEMBERSHIP_ACTIVATION_FAILED", message: error.message || "Unable to activate MSIR Prism membership." });
    }
  });

  app.get("/api/watchlist/favorites", async (req, res) => {
    const token = readBearerTokenFromHeader(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "UNAUTHORIZED", message: "Please sign in before syncing favorites." });

    try {
      const user = await hsApiRequest("/gsyen/auth/v1/user", { method: "GET", token });
      return res.json({ ok: true, source: "hs-user-metadata", ...readCloudFavoriteState(user) });
    } catch (error: any) {
      return res.status(error.status || 502).json({ error: error.code || "FAVORITES_SYNC_FAILED", message: error.message || "Unable to load cloud favorites." });
    }
  });

  app.put("/api/watchlist/favorites", async (req, res) => {
    const token = readBearerTokenFromHeader(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "UNAUTHORIZED", message: "Please sign in before syncing favorites." });

    const symbols = sanitizeFavoriteSymbols(req.body?.symbols);
    const updatedAt = new Date().toISOString();

    try {
      const user = await hsApiRequest("/gsyen/auth/v1/user", { method: "GET", token });
      const metadata = readHsUserMetadata(user);
      const prismEdgeMetadata = isRecord(metadata.prism_edge) ? metadata.prism_edge : {};
      const payload = await hsApiRequest("/gsyen/auth/v1/user", {
        method: "PUT",
        token,
        body: JSON.stringify({
          data: {
            ...metadata,
            prism_edge: { ...prismEdgeMetadata, favorite_symbols: symbols, favorite_symbols_updated_at: updatedAt }
          }
        })
      });
      const saved = readCloudFavoriteState(payload);
      return res.json({ ok: true, source: "hs-user-metadata", symbols: saved.symbols.length > 0 || symbols.length === 0 ? saved.symbols : symbols, updatedAt: saved.updatedAt || updatedAt });
    } catch (error: any) {
      return res.status(error.status || 502).json({ error: error.code || "FAVORITES_SYNC_FAILED", message: error.message || "Unable to save cloud favorites." });
    }
  });
}

function sanitizeFavoriteSymbols(value: unknown) {
  if (!Array.isArray(value)) return [];
  const symbols: string[] = [];
  const seen = new Set<string>();
  value.forEach((item) => {
    const symbol = normalizeMarketSymbol(String(item || ""));
    if (!symbol || seen.has(symbol) || !isValidMarketSymbol(symbol)) return;
    seen.add(symbol);
    symbols.push(symbol);
  });
  return symbols.slice(0, FAVORITE_SYMBOL_LIMIT);
}

function readCloudFavoriteState(user: unknown) {
  const metadata = readHsUserMetadata(user);
  const prismEdgeMetadata = isRecord(metadata.prism_edge) ? metadata.prism_edge : {};
  const symbols = sanitizeFavoriteSymbols(Array.isArray(prismEdgeMetadata.favorite_symbols) ? prismEdgeMetadata.favorite_symbols : metadata.prism_edge_favorite_symbols);
  const updatedAt = typeof prismEdgeMetadata.favorite_symbols_updated_at === "string" ? prismEdgeMetadata.favorite_symbols_updated_at : undefined;
  return { symbols, updatedAt };
}

function readHsUserMetadata(user: unknown) {
  if (!isRecord(user)) return {};
  const metadata = isRecord(user.user_metadata) ? user.user_metadata : isRecord(user.raw_user_meta_data) ? user.raw_user_meta_data : {};
  return { ...metadata };
}

function readBearerTokenFromHeader(header: unknown) {
  const value = Array.isArray(header) ? header[0] : String(header || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
