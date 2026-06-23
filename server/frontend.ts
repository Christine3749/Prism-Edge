import type { Express } from "express";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  HTML_CACHE_CONTROL,
  STATIC_ASSET_CACHE_CONTROL
} from "./config";

export async function setupFrontend(app: Express) {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Prism-Edge web server in development mode with Vite middleware...");
    const vite = await createViteServer({
      configFile: path.join(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    return;
  }

  console.log("Serving production bundle from dist folder...");
  const distPath = path.join(process.cwd(), "dist");

  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "5m",
    setHeaders: (res) => {
      res.setHeader("Cache-Control", STATIC_ASSET_CACHE_CONTROL);
    }
  }));

  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
    }
  }));

  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(distPath, "index.html"));
  });
}
