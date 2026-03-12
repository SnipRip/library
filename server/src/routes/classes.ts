import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const CreateClassSchema = z.object({
  name: z.string().min(1),
  status: z.string().optional().default("active"),
});

export async function registerClassRoutes(app: FastifyInstance) {
  app.get("/classes", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const result = await pool.query(
      `select id, name, status, created_at
       from classes
       order by created_at desc`,
    );
    return reply.send(result.rows);
  });

  app.get("/classes/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const { id } = req.params as { id: string };
    const result = await pool.query(
      `select id, name, status, created_at
       from classes
       where id = $1
       limit 1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) return reply.code(404).send({ message: "Not found" });
    return reply.send(row);
  });

  app.post("/classes", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateClassSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const { name, status } = parsed.data;

    const result = await pool.query(
      `insert into classes (name, status)
       values ($1, $2)
       returning id, name, status, created_at`,
      [name, status],
    );

    return reply.code(201).send(result.rows[0]);
  });
}
