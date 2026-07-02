import type { Express } from "express";
import { registerAuthRoutes } from "./apiAuthRoutes";
import { registerMarketRoutes } from "./apiMarketRoutes";
import { registerQuantRoutes } from "./apiQuantRoutes";
import { API_CACHE_CONTROL } from "./config";

export function registerApiRoutes(app: Express, apiBaseUrl: string) {
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", API_CACHE_CONTROL);
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  app.get("/api/health", async (_req, res) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/health`, { signal: AbortSignal.timeout(1500) });
      const payload = await response.json();
      return res.status(response.status).json(payload);
    } catch {
      return res.json({
        status: "degraded",
        web: "ok",
        apiBaseUrl,
        message: "FastAPI service is not reachable; Node fallback is active."
      });
    }
  });

  registerAuthRoutes(app);
  registerMarketRoutes(app);
  registerQuantRoutes(app, apiBaseUrl);

  app.use("/api", (_req, res) => {
    return res.status(404).json({ error: "API route not found." });
  });
}
