import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { registerApiRoutes } from "./server/apiRoutes";
import { API_BASE_URL, PORT } from "./server/config";
import { setupFrontend } from "./server/frontend";
import { createWsGateway } from "./server/wsGateway";

dotenv.config();
dotenv.config({ path: ".env.local" });

const app = express();
app.use(express.json({ limit: "8mb" }));

registerApiRoutes(app, API_BASE_URL);

async function bootstrap() {
  await setupFrontend(app);

  const httpServer = createServer(app);
  const wss = createWsGateway();

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Prism-Edge running at http://localhost:${PORT}`);
    console.log(`WebSocket gateway: ws://localhost:${PORT}/ws`);
    console.log(`Analysis API target: ${API_BASE_URL}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failure bootstrapping Prism-Edge web server:", err);
});
