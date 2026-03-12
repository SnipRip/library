import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getEnv } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { getPool } from "../db/pool.js";
import { createSession, generateToken } from "../auth/sessions.js";

const DEV_ADMIN_USERNAME = "admin";
const DEV_ADMIN_PASSWORD = "Feelpain@1";
const DEV_ADMIN_TOKEN = "dev-admin-token";

const LoginSchema = z.object({
  email: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  identifier: z.string().min(1).optional(),
  password: z.string().min(1),
});

function pickIdentifier(body: z.infer<typeof LoginSchema>) {
  return body.identifier ?? body.email ?? body.username ?? "";
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const env = getEnv();

    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const identifier = pickIdentifier(parsed.data);
    const { password } = parsed.data;

    // Optional legacy dev shortcut (kept for convenience)
    if (process.env.NODE_ENV !== "production" && env.ENABLE_DEV_AUTH) {
      if (identifier === DEV_ADMIN_USERNAME && password === DEV_ADMIN_PASSWORD) {
        return reply.send({
          token: DEV_ADMIN_TOKEN,
          user: {
            id: "dev-admin",
            username: DEV_ADMIN_USERNAME,
            role: "admin",
          },
        });
      }
    }

    const pool = getPool();
    const result = await pool.query(
      `select id, username, role
       from users
       where is_active = true
         and (username = $1 or email = $1)
         and password_hash = crypt($2, password_hash)
       limit 1`,
      [identifier, password],
    );

    const user = result.rows[0] as { id: string; username: string; role: string } | undefined;
    if (!user) return reply.code(401).send({ message: "Invalid credentials" });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    await createSession(user.id, token, expiresAt);

    return reply.send({ token, user });
  });

  app.get("/me", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });
    return reply.send(auth.user);
  });
}
