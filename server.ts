import dotenv from "dotenv";
import express from "express";
import { registerApiRoutes } from "./server/apiRoutes";
import { API_BASE_URL, PORT } from "./server/config";
import { setupFrontend } from "./server/frontend";

dotenv.config();
dotenv.config({ path: ".env.local" });

const app = express();
app.use(express.json({ limit: "8mb" }));

registerApiRoutes(app, API_BASE_URL);

async function bootstrap() {
  await setupFrontend(app);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Prism-Edge web application running at http://localhost:${PORT}`);
    console.log(`Analysis API gateway target: ${API_BASE_URL}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failure bootstrapping Prism-Edge web server:", err);
});
