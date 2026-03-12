import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { getEnv } from "./env.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerStudentRoutes } from "./routes/students.js";

const env = getEnv();

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

app.get("/health", async () => ({ ok: true }));

await registerAuthRoutes(app);
await registerStudentRoutes(app);

app.listen({ port: env.PORT, host: "0.0.0.0" });
