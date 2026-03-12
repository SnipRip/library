import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const CreateSeatSchema = z.object({
  seat_number: z.string().min(1),
  hall_id: z.string().uuid().optional().nullable(),
  // backward compatibility
  hall: z.string().optional().nullable(),
});

const UpdateSeatSchema = z.object({
  status: z.enum(["available", "occupied", "maintenance"]),
});

const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const CreateShiftSchema = z.object({
  name: z.string().min(1),
  start_time: TimeSchema,
  end_time: TimeSchema,
  monthly_fee: z.number().int().nonnegative().nullable().optional(),
});

const CreateHallSchema = z.object({
  name: z.string().min(1),
});

export async function registerLibraryRoutes(app: FastifyInstance) {
  app.get("/library/halls", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const result = await pool.query(
      `select id, name, created_at
       from library_halls
       order by name asc`,
    );

    return reply.send(result.rows);
  });

  app.post("/library/halls", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateHallSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const { name } = parsed.data;

    const result = await pool.query(
      `insert into library_halls (name)
       values ($1)
       returning id, name, created_at`,
      [name],
    );

    return reply.code(201).send(result.rows[0]);
  });

  app.get("/library/shifts", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const result = await pool.query(
      `select
        id,
        name,
        start_time::text as start_time,
        end_time::text as end_time,
        monthly_fee,
        created_at
      from library_shifts
      order by start_time asc, name asc`,
    );
    return reply.send(result.rows);
  });

  app.post("/library/shifts", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateShiftSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const { name, start_time, end_time, monthly_fee } = parsed.data;
    const result = await pool.query(
      `insert into library_shifts (name, start_time, end_time, monthly_fee)
       values ($1, $2, $3, $4)
       returning id, name, start_time::text as start_time, end_time::text as end_time, monthly_fee, created_at`,
      [name, start_time, end_time, monthly_fee ?? null],
    );

    return reply.code(201).send(result.rows[0]);
  });

  app.get("/library/seats", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const result = await pool.query(
      `select
        s.id,
        s.seat_number,
        s.hall_id,
        h.name as hall_name,
        s.hall,
        s.status,
        s.occupied_until,
        st.full_name as occupant_name
      from library_seats s
      left join library_halls h on h.id = s.hall_id
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
    const { seat_number, hall_id, hall } = parsed.data;

    let resolvedHallId: string | null = hall_id ?? null;
    const hallName = (hall ?? "").trim();

    if (!resolvedHallId && hallName) {
      // Resolve/create hall by name (keeps older clients working)
      await pool.query(
        `insert into library_halls (name)
         values ($1)
         on conflict (name) do nothing`,
        [hallName],
      );

      const hallRes = await pool.query(
        `select id
         from library_halls
         where name = $1
         limit 1`,
        [hallName],
      );
      resolvedHallId = (hallRes.rows[0]?.id as string | undefined) ?? null;
    }

    const result = await pool.query(
      `insert into library_seats (seat_number, hall_id, hall)
       values ($1, $2, $3)
       returning id, seat_number, hall_id, hall, status, occupied_until`,
      [seat_number, resolvedHallId, hallName || null],
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
