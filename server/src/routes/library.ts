import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const CreateSeatSchema = z.object({
  seat_number: z.string().min(1),
  hall: z.string().optional().nullable(),
});

const UpdateSeatSchema = z.object({
  status: z.enum(["available", "occupied", "maintenance"]),
});

export async function registerLibraryRoutes(app: FastifyInstance) {
  app.get("/library/seats", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const result = await pool.query(
      `select
        s.id,
        s.seat_number,
        s.status,
        s.occupied_until,
        st.full_name as occupant_name
      from library_seats s
      left join students st on st.id = s.occupant_student_id
      order by s.seat_number asc`,
    );

    return reply.send(result.rows);
  });

  app.post("/library/seats", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateSeatSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const { seat_number, hall } = parsed.data;

    const result = await pool.query(
      `insert into library_seats (seat_number, hall)
       values ($1, $2)
       returning id, seat_number, status, occupied_until`,
      [seat_number, hall ?? null],
    );

    return reply.code(201).send(result.rows[0]);
  });

  app.patch("/library/seats/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = UpdateSeatSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const { id } = req.params as { id: string };
    const pool = getPool();

    await pool.query(
      `update library_seats
       set status = $2,
           updated_at = now()
       where id = $1`,
      [id, parsed.data.status],
    );

    return reply.send({ ok: true });
  });

  app.post("/library/seats/:id/vacate", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const { id } = req.params as { id: string };
    const pool = getPool();

    await pool.query(
      `update library_seats
       set status = 'available',
           occupant_student_id = null,
           occupied_until = null,
           updated_at = now()
       where id = $1`,
      [id],
    );

    return reply.send({ ok: true });
  });
}
