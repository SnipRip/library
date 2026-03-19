import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const CreateSeatSchema = z.object({
  seat_number: z.string().min(1),
  hall_id: z.string().uuid().optional().nullable(),
  seat_type_id: z.string().uuid().optional().nullable(),
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
  pricing: z
    .array(
      z.object({
        seat_type_id: z.string().uuid(),
        monthly_fee: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

const UpdateShiftSchema = z
  .object({
    monthly_fee: z.number().int().nonnegative().nullable().optional(),
    pricing: z
      .array(
        z.object({
          seat_type_id: z.string().uuid(),
          monthly_fee: z.number().int().nonnegative(),
        }),
      )
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const CreateHallSchema = z.object({
  name: z.string().min(1),
});

const UpdateHallSchema = z
  .object({
    name: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const CreateSeatTypeSchema = z.object({
  name: z.string().min(1),
});

const CreateMembershipSchema = z.object({
  student_id: z.string().uuid(),
  shift_id: z.string().uuid(),
  seat_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  reserved_seat_id: z.string().uuid().nullable().optional(),
  reserved_fee: z.number().int().nonnegative().nullable().optional(),
});

const UpdateMembershipSchema = z
  .object({
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const CreateCheckinSchema = z.object({
  membership_id: z.string().uuid(),
  seat_id: z.string().uuid(),
});

const UpdateLockerSettingsSchema = z.object({
  total_lockers: z.number().int().nonnegative(),
  monthly_fee: z.number().int().nonnegative(),
});

const CreateLockerAssignmentSchema = z.object({
  locker_number: z.number().int().positive(),
  student_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const VacateSeatSchema = z.object({
  checkin_id: z.string().uuid().optional(),
});

function computeShiftEndAt(now: Date, startHHMM: string, endHHMM: string) {
  const [endH, endM] = endHHMM.split(":").map((n) => Number(n));
  const [startH, startM] = startHHMM.split(":").map((n) => Number(n));

  const end = new Date(now);
  end.setHours(endH, endM, 0, 0);

  const start = new Date(now);
  start.setHours(startH, startM, 0, 0);

  // If end is <= start, treat as overnight shift ending next day.
  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  // If current time already passed shift end (mis-click), end now + 1h fallback.
  if (end.getTime() <= now.getTime()) {
    const fallback = new Date(now);
    fallback.setHours(fallback.getHours() + 1);
    return fallback;
  }

  return end;
}

function isActiveOnDateRangeSql(dateExpr: string, tableAlias = "m") {
  // Uses dateExpr as the comparison date.
  // Qualify with table alias to avoid ambiguous column refs when joining.
  const a = tableAlias ? `${tableAlias}.` : "";
  return `${a}status = 'active'
    and ${a}start_date <= ${dateExpr}
    and (${a}end_date is null or ${a}end_date >= ${dateExpr})`;
}

function isReservationBlockingSql(dateExpr: string, tableAlias = "m") {
  // A reservation blocks the seat even if its start_date is in the future.
  const a = tableAlias ? `${tableAlias}.` : "";
  return `${a}status = 'active'
    and (${a}end_date is null or ${a}end_date >= ${dateExpr})`;
}

export async function registerLibraryRoutes(app: FastifyInstance) {
  app.get("/library/seat-types", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const result = await pool.query(
      `select id, name, created_at
       from library_seat_types
       order by name asc`,
    );

    return reply.send(result.rows);
  });

  app.post("/library/seat-types", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateSeatTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const name = parsed.data.name.trim();
    const result = await pool.query(
      `insert into library_seat_types (name)
       values ($1)
       returning id, name, created_at`,
      [name],
    );

    return reply.code(201).send(result.rows[0]);
  });

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

  app.patch("/library/halls/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = UpdateHallSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const { id } = req.params as { id: string };
    const pool = getPool();

    const { name } = parsed.data;
    const res = await pool.query(
      `update library_halls
       set name = coalesce($2, name),
           updated_at = now()
       where id = $1
       returning id, name, created_at, updated_at`,
      [id, name ?? null],
    );

    const row = res.rows[0];
    if (!row) return reply.code(404).send({ message: "Hall not found" });
    return reply.send(row);
  });

  app.get("/library/shifts", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const result = await pool.query(
      `select
        s.id,
        s.name,
        s.start_time::text as start_time,
        s.end_time::text as end_time,
        s.monthly_fee,
        s.created_at,
        coalesce(
          (
            select json_agg(
              json_build_object(
                'seat_type_id', p.seat_type_id,
                'seat_type_name', st.name,
                'monthly_fee', p.monthly_fee
              )
              order by st.name asc
            )
            from library_shift_pricing p
            join library_seat_types st on st.id = p.seat_type_id
            where p.shift_id = s.id
          ),
          '[]'::json
        ) as pricing
      from library_shifts s
      order by s.start_time asc, s.name asc`,
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
    const { name, start_time, end_time, monthly_fee, pricing } = parsed.data;

    const client = await pool.connect();
    try {
      await client.query("begin");
      const shiftRes = await client.query(
        `insert into library_shifts (name, start_time, end_time, monthly_fee)
         values ($1, $2, $3, $4)
         returning id, name, start_time::text as start_time, end_time::text as end_time, monthly_fee, created_at`,
        [name, start_time, end_time, monthly_fee ?? null],
      );
      const shift = shiftRes.rows[0] as { id: string } | undefined;
      if (!shift) throw new Error("Failed to create shift");

      if (pricing && pricing.length > 0) {
        for (const row of pricing) {
          await client.query(
            `insert into library_shift_pricing (shift_id, seat_type_id, monthly_fee)
             values ($1, $2, $3)
             on conflict (shift_id, seat_type_id)
             do update set monthly_fee = excluded.monthly_fee, updated_at = now()`,
            [shift.id, row.seat_type_id, row.monthly_fee],
          );
        }
      }

      const outRes = await client.query(
        `select
          s.id,
          s.name,
          s.start_time::text as start_time,
          s.end_time::text as end_time,
          s.monthly_fee,
          s.created_at,
          coalesce(
            (
              select json_agg(
                json_build_object(
                  'seat_type_id', p.seat_type_id,
                  'seat_type_name', st.name,
                  'monthly_fee', p.monthly_fee
                )
                order by st.name asc
              )
              from library_shift_pricing p
              join library_seat_types st on st.id = p.seat_type_id
              where p.shift_id = s.id
            ),
            '[]'::json
          ) as pricing
         from library_shifts s
         where s.id = $1`,
        [shift.id],
      );

      await client.query("commit");
      return reply.code(201).send(outRes.rows[0]);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });

  app.patch("/library/shifts/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = UpdateShiftSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const { id } = req.params as { id: string };
    const pool = getPool();
    const { monthly_fee, pricing } = parsed.data;

    const client = await pool.connect();
    try {
      await client.query("begin");

      if (monthly_fee !== undefined) {
        await client.query(
          `update library_shifts
           set monthly_fee = $2,
               updated_at = now()
           where id = $1`,
          [id, monthly_fee],
        );
      }

      if (pricing !== undefined) {
        await client.query(`delete from library_shift_pricing where shift_id = $1`, [id]);
        for (const row of pricing) {
          await client.query(
            `insert into library_shift_pricing (shift_id, seat_type_id, monthly_fee)
             values ($1, $2, $3)
             on conflict (shift_id, seat_type_id)
             do update set monthly_fee = excluded.monthly_fee, updated_at = now()`,
            [id, row.seat_type_id, row.monthly_fee],
          );
        }
      }

      const outRes = await client.query(
        `select
          s.id,
          s.name,
          s.start_time::text as start_time,
          s.end_time::text as end_time,
          s.monthly_fee,
          s.created_at,
          coalesce(
            (
              select json_agg(
                json_build_object(
                  'seat_type_id', p.seat_type_id,
                  'seat_type_name', st.name,
                  'monthly_fee', p.monthly_fee
                )
                order by st.name asc
              )
              from library_shift_pricing p
              join library_seat_types st on st.id = p.seat_type_id
              where p.shift_id = s.id
            ),
            '[]'::json
          ) as pricing
        from library_shifts s
        where s.id = $1`,
        [id],
      );

      await client.query("commit");

      const row = outRes.rows[0];
      if (!row) return reply.code(404).send({ message: "Shift not found" });
      return reply.send(row);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });

  app.delete("/library/shifts/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const { id } = req.params as { id: string };
    const pool = getPool();

    // Block deletion if shift has admissions or check-ins.
    const membershipRes = await pool.query(
      `select 1
       from library_memberships m
       where m.shift_id = $1
       limit 1`,
      [id],
    );
    if ((membershipRes.rows?.length ?? 0) > 0) {
      return reply.code(409).send({ message: "Shift has admissions and cannot be deleted" });
    }

    const checkinsRes = await pool.query(
      `select 1
       from library_checkins c
       where c.shift_id = $1
       limit 1`,
      [id],
    );
    if ((checkinsRes.rows?.length ?? 0) > 0) {
      return reply.code(409).send({ message: "Shift has check-ins and cannot be deleted" });
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(`delete from library_shift_pricing where shift_id = $1`, [id]);
      const res = await client.query(`delete from library_shifts where id = $1 returning id`, [id]);
      if (res.rowCount === 0) {
        await client.query("rollback");
        return reply.code(404).send({ message: "Shift not found" });
      }
      await client.query("commit");
      return reply.send({ ok: true });
    } catch (err: unknown) {
      await client.query("rollback");
      const message = err instanceof Error ? err.message : "Failed to delete shift";
      return reply.code(409).send({ message });
    } finally {
      client.release();
    }
  });

  app.delete("/library/halls/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const { id } = req.params as { id: string };
    const pool = getPool();

    const res = await pool.query(`delete from library_halls where id = $1 returning id`, [id]);
    if (res.rowCount === 0) return reply.code(404).send({ message: "Hall not found" });
    return reply.send({ ok: true });
  });

  app.get("/library/seats", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const { shift_id } = req.query as { shift_id?: string };

    const pool = getPool();

    if (!shift_id) {
      const result = await pool.query(
        `select
          s.id,
          s.seat_number,
          s.hall_id,
          h.name as hall_name,
          s.hall,
          s.seat_type_id,
          t.name as seat_type_name,
          s.status,
          s.occupied_until,
          st.full_name as occupant_name
        from library_seats s
        left join library_halls h on h.id = s.hall_id
        left join library_seat_types t on t.id = s.seat_type_id
        left join students st on st.id = s.occupant_student_id
        order by s.seat_number asc`,
      );
      return reply.send(result.rows);
    }

    // Shift-aware view: reserved seats block others even if empty.
    const result = await pool.query(
      `with shift as (
        select id, start_time::text as start_time, end_time::text as end_time
        from library_shifts
        where id = $1
      ),
      reserved as (
        select distinct on (m.reserved_seat_id)
          m.reserved_seat_id as seat_id,
          m.id as membership_id,
          m.student_id,
          st.full_name,
          m.start_date,
          m.end_date
        from library_memberships m
        join students st on st.id = m.student_id
        where m.shift_id = $1
          and m.reserved_seat_id is not null
          and ${isReservationBlockingSql("current_date", "m")}
        order by m.reserved_seat_id, m.start_date asc, m.created_at desc
      ),
      active_checkins as (
        select
          c.id as checkin_id,
          c.seat_id,
          c.student_id,
          st.full_name,
          c.end_at
        from library_checkins c
        join students st on st.id = c.student_id
        where c.shift_id = $1
          and now() >= c.start_at
          and now() < c.end_at
      )
      select
        s.id,
        s.seat_number,
        s.hall_id,
        h.name as hall_name,
        s.hall,
        s.seat_type_id,
        t.name as seat_type_name,
        case
          when s.status = 'maintenance' then 'maintenance'
          when ac.seat_id is not null then 'occupied'
          when r.seat_id is not null then 'occupied'
          else 'available'
        end as status,
        case
          when ac.seat_id is not null then ac.end_at::text
          when r.seat_id is not null and r.end_date is not null then r.end_date::text
          else null
        end as occupied_until,
        case
          when ac.seat_id is not null then ac.full_name
          when r.seat_id is not null then (r.full_name || ' (Reserved)')
          else null
        end as occupant_name,
        (r.seat_id is not null) as is_reserved,
        r.membership_id as reserved_membership_id,
        ac.checkin_id as active_checkin_id
      from library_seats s
      left join library_halls h on h.id = s.hall_id
      left join library_seat_types t on t.id = s.seat_type_id
      left join active_checkins ac on ac.seat_id = s.id
      left join reserved r on r.seat_id = s.id
      order by s.seat_number asc`,
      [shift_id],
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
    const { seat_number, hall_id, hall, seat_type_id } = parsed.data;

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
      `insert into library_seats (seat_number, hall_id, hall, seat_type_id)
       values ($1, $2, $3, $4)
       returning id, seat_number, hall_id, hall, seat_type_id, status, occupied_until`,
      [seat_number, resolvedHallId, hallName || null, seat_type_id ?? null],
    );

    return reply.code(201).send(result.rows[0]);
  });

  app.delete("/library/seats/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const { id } = req.params as { id: string };
    const pool = getPool();

    // Block deletion if seat is reserved by any active membership (current or future).
    const reservedRes = await pool.query(
      `select 1
       from library_memberships m
       where m.reserved_seat_id = $1
         and m.status = 'active'
         and (m.end_date is null or m.end_date >= current_date)
       limit 1`,
      [id],
    );
    if ((reservedRes.rows?.length ?? 0) > 0) {
      return reply.code(409).send({ message: "Seat is reserved and cannot be deleted" });
    }

    // Block deletion if seat is currently assigned via an active check-in.
    const activeCheckinRes = await pool.query(
      `select 1
       from library_checkins c
       where c.seat_id = $1
         and now() >= c.start_at
         and now() < c.end_at
       limit 1`,
      [id],
    );
    if ((activeCheckinRes.rows?.length ?? 0) > 0) {
      return reply.code(409).send({ message: "Seat is currently occupied and cannot be deleted" });
    }

    // Backward-compat safety: if legacy occupant fields show occupancy, block.
    const legacySeatRes = await pool.query(
      `select status, occupant_student_id, occupied_until
       from library_seats
       where id = $1
       limit 1`,
      [id],
    );
    const legacySeat = legacySeatRes.rows[0] as
      | { status: string; occupant_student_id: string | null; occupied_until: string | null }
      | undefined;
    if (!legacySeat) return reply.code(404).send({ message: "Seat not found" });
    if (
      legacySeat.status === "occupied" ||
      (legacySeat.occupant_student_id && (!legacySeat.occupied_until || new Date(legacySeat.occupied_until).getTime() > Date.now()))
    ) {
      return reply.code(409).send({ message: "Seat is currently occupied and cannot be deleted" });
    }

    try {
      const res = await pool.query(`delete from library_seats where id = $1 returning id`, [id]);
      if (res.rowCount === 0) return reply.code(404).send({ message: "Seat not found" });
      return reply.send({ ok: true });
    } catch (err: unknown) {
      // Most common: foreign key restriction from library_checkins(seat_id) on delete restrict.
      const message = err instanceof Error ? err.message : "Failed to delete seat";
      return reply.code(409).send({ message });
    }
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

    const parsed = VacateSeatSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const { id } = req.params as { id: string };
    const pool = getPool();

    // If checkin_id provided, end that check-in early.
    if (parsed.data.checkin_id) {
      await pool.query(
        `update library_checkins
         set end_at = least(end_at, now()),
             updated_at = now()
         where id = $1
           and seat_id = $2`,
        [parsed.data.checkin_id, id],
      );
      return reply.send({ ok: true });
    }

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

  app.get("/library/memberships", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const { shift_id, seat_type_id, active } = req.query as {
      shift_id?: string;
      seat_type_id?: string;
      active?: string;
    };

    const pool = getPool();

    const clauses: string[] = [];
    const params: Array<string> = [];

    if (shift_id) {
      params.push(shift_id);
      clauses.push(`m.shift_id = $${params.length}`);
    }
    if (seat_type_id) {
      params.push(seat_type_id);
      clauses.push(`m.seat_type_id = $${params.length}`);
    }
    if (active === "true") {
      clauses.push(isActiveOnDateRangeSql('current_date', 'm'));
    }

    const whereSql = clauses.length ? `where ${clauses.join(" and ")}` : "";

    const result = await pool.query(
      `select
        m.id,
        m.student_id,
        st.full_name as student_name,
        m.shift_id,
        sh.name as shift_name,
        m.seat_type_id,
        ty.name as seat_type_name,
        m.start_date,
        m.end_date,
        m.status,
        m.reserved_seat_id,
        s.seat_number as reserved_seat_number,
        m.reserved_fee,
        m.created_at
      from library_memberships m
      join students st on st.id = m.student_id
      join library_shifts sh on sh.id = m.shift_id
      join library_seat_types ty on ty.id = m.seat_type_id
      left join library_seats s on s.id = m.reserved_seat_id
      ${whereSql}
      order by m.created_at desc`,
      params,
    );

    return reply.send(result.rows);
  });

  app.post("/library/memberships", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateMembershipSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const {
      student_id,
      shift_id,
      seat_type_id,
      start_date,
      end_date,
      reserved_seat_id,
      reserved_fee,
    } = parsed.data;

    // Validate reserved seat belongs to the seat type.
    if (reserved_seat_id) {
      const seatRes = await pool.query(
        `select id, seat_type_id
         from library_seats
         where id = $1
         limit 1`,
        [reserved_seat_id],
      );
      const seat = seatRes.rows[0] as { seat_type_id: string | null } | undefined;
      if (!seat) return reply.code(404).send({ message: "Seat not found" });
      if (!seat.seat_type_id || seat.seat_type_id !== seat_type_id) {
        return reply.code(400).send({ message: "Reserved seat type mismatch" });
      }

      // Ensure no overlapping active reservation for same shift+seat.
      const start = start_date ?? null;
      const end = end_date ?? null;
      const overlapRes = await pool.query(
        `select 1
         from library_memberships m
         where m.shift_id = $1
           and m.reserved_seat_id = $2
           and m.status = 'active'
           and daterange(m.start_date, coalesce(m.end_date, 'infinity'::date), '[]')
             && daterange(coalesce($3::date, current_date), coalesce($4::date, 'infinity'::date), '[]')
         limit 1`,
        [shift_id, reserved_seat_id, start, end],
      );
      if ((overlapRes.rows?.length ?? 0) > 0) {
        return reply.code(409).send({ message: "Seat is already reserved for this shift" });
      }
    }

    const result = await pool.query(
      `insert into library_memberships (
          student_id,
          shift_id,
          seat_type_id,
          start_date,
          end_date,
          reserved_seat_id,
          reserved_fee
        )
       values ($1, $2, $3, coalesce($4::date, current_date), $5::date, $6, $7)
       returning id, student_id, shift_id, seat_type_id, start_date, end_date, status, reserved_seat_id, reserved_fee, created_at`,
      [
        student_id,
        shift_id,
        seat_type_id,
        start_date ?? null,
        end_date ?? null,
        reserved_seat_id ?? null,
        reserved_fee ?? null,
      ],
    );

    return reply.code(201).send(result.rows[0]);
  });

  app.patch("/library/memberships/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = UpdateMembershipSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const { id } = req.params as { id: string };
    const { end_date } = parsed.data;

    const pool = getPool();
    const res = await pool.query(
      `update library_memberships m
       set end_date = $2::date,
           updated_at = now()
       where m.id = $1
       returning m.id, m.shift_id, m.reserved_seat_id, m.start_date, m.end_date, m.status, m.updated_at`,
      [id, end_date ?? null],
    );

    const row = res.rows[0];
    if (!row) return reply.code(404).send({ message: "Membership not found" });
    return reply.send(row);
  });

  app.post("/library/checkins", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateCheckinSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const { membership_id, seat_id } = parsed.data;

    const membershipRes = await pool.query(
      `select
        m.id,
        m.student_id,
        m.shift_id,
        m.seat_type_id,
        m.reserved_seat_id,
        sh.start_time::text as shift_start,
        sh.end_time::text as shift_end
      from library_memberships m
      join library_shifts sh on sh.id = m.shift_id
      where m.id = $1
        and ${isActiveOnDateRangeSql("current_date", "m")}
      limit 1`,
      [membership_id],
    );
    const membership = membershipRes.rows[0] as
      | {
          id: string;
          student_id: string;
          shift_id: string;
          seat_type_id: string;
          reserved_seat_id: string | null;
          shift_start: string;
          shift_end: string;
        }
      | undefined;

    if (!membership) return reply.code(404).send({ message: "Active membership not found" });

    // Reserved seat rule: if membership reserved, must use that seat.
    if (membership.reserved_seat_id && membership.reserved_seat_id !== seat_id) {
      return reply.code(400).send({ message: "This membership has a reserved seat" });
    }

    const seatRes = await pool.query(
      `select id, status, seat_type_id
       from library_seats
       where id = $1
       limit 1`,
      [seat_id],
    );
    const seat = seatRes.rows[0] as { status: string; seat_type_id: string | null } | undefined;
    if (!seat) return reply.code(404).send({ message: "Seat not found" });
    if (seat.status === "maintenance") return reply.code(409).send({ message: "Seat is under maintenance" });
    if (!seat.seat_type_id || seat.seat_type_id !== membership.seat_type_id) {
      return reply.code(400).send({ message: "Seat type mismatch" });
    }

    // Block seats reserved by someone else in the same shift.
    const reservedByOther = await pool.query(
      `select 1
       from library_memberships m
       where m.shift_id = $1
         and m.reserved_seat_id = $2
         and m.id <> $3
         and ${isReservationBlockingSql("current_date", "m")}
       limit 1`,
      [membership.shift_id, seat_id, membership.id],
    );
    if ((reservedByOther.rows?.length ?? 0) > 0) {
      return reply.code(409).send({ message: "Seat is reserved" });
    }

    const endAt = computeShiftEndAt(new Date(), membership.shift_start, membership.shift_end);

    try {
      const res = await pool.query(
        `insert into library_checkins (membership_id, student_id, shift_id, seat_id, start_at, end_at)
         values ($1, $2, $3, $4, now(), $5)
         returning id, membership_id, student_id, shift_id, seat_id, start_at, end_at`,
        [membership.id, membership.student_id, membership.shift_id, seat_id, endAt.toISOString()],
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err: unknown) {
      // Most common failure: exclusion constraint overlap.
      const msg = err instanceof Error ? err.message : "Check-in failed";
      return reply.code(409).send({ message: msg });
    }
  });

  app.get("/library/lockers/settings", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const res = await pool.query(
      `select total_lockers, monthly_fee, updated_at
       from library_locker_settings
       order by created_at asc
       limit 1`,
    );

    const row = res.rows[0] as
      | { total_lockers: number; monthly_fee: number; updated_at: string }
      | undefined;
    return reply.send(row ?? { total_lockers: 0, monthly_fee: 0, updated_at: null });
  });

  app.put("/library/lockers/settings", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = UpdateLockerSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const { total_lockers, monthly_fee } = parsed.data;

    const maxAssignedRes = await pool.query(
      `select coalesce(max(locker_number), 0) as max_locker_number
       from library_locker_assignments
       where status = 'active' and end_date is null`,
    );
    const maxAssigned = Number(maxAssignedRes.rows[0]?.max_locker_number ?? 0);
    if (total_lockers < maxAssigned) {
      return reply
        .code(409)
        .send({ message: `Total lockers cannot be less than ${maxAssigned} (an active assignment exists)` });
    }

    const updateRes = await pool.query(
      `update library_locker_settings
       set total_lockers = $1,
           monthly_fee = $2,
           updated_at = now()
       returning total_lockers, monthly_fee, updated_at`,
      [total_lockers, monthly_fee],
    );

    if (updateRes.rows[0]) return reply.send(updateRes.rows[0]);

    const insertRes = await pool.query(
      `insert into library_locker_settings (total_lockers, monthly_fee)
       values ($1, $2)
       returning total_lockers, monthly_fee, updated_at`,
      [total_lockers, monthly_fee],
    );
    return reply.send(insertRes.rows[0]);
  });

  app.get("/library/lockers", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();

    const settingsRes = await pool.query(
      `select total_lockers
       from library_locker_settings
       order by created_at asc
       limit 1`,
    );
    const totalLockers = Number(settingsRes.rows[0]?.total_lockers ?? 0);
    if (!Number.isFinite(totalLockers) || totalLockers <= 0) return reply.send([]);

    const res = await pool.query(
      `with active as (
        select a.id as assignment_id, a.locker_number, a.student_id, a.start_date
        from library_locker_assignments a
        where a.status = 'active' and a.end_date is null
      )
      select
        gs as locker_number,
        a.assignment_id,
        a.student_id,
        st.full_name as student_name,
        a.start_date
      from generate_series(1, $1::int) gs
      left join active a on a.locker_number = gs
      left join students st on st.id = a.student_id
      order by gs asc`,
      [totalLockers],
    );

    return reply.send(res.rows);
  });

  app.get("/library/lockers/assignments", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const { active } = req.query as { active?: string };
    const pool = getPool();

    const where = active === "false" ? "" : "where a.status = 'active' and a.end_date is null";
    const res = await pool.query(
      `select
        a.id,
        a.locker_number,
        a.student_id,
        st.full_name as student_name,
        a.start_date,
        a.end_date,
        a.status,
        a.created_at
      from library_locker_assignments a
      join students st on st.id = a.student_id
      ${where}
      order by a.locker_number asc, a.created_at desc`,
    );

    return reply.send(res.rows);
  });

  app.post("/library/lockers/assignments", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateLockerAssignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const { locker_number, student_id, start_date } = parsed.data;

    const settingsRes = await pool.query(
      `select total_lockers
       from library_locker_settings
       order by created_at asc
       limit 1`,
    );
    const totalLockers = Number(settingsRes.rows[0]?.total_lockers ?? 0);
    if (locker_number > totalLockers) {
      return reply
        .code(400)
        .send({ message: `Locker number must be between 1 and ${Math.max(0, totalLockers)}` });
    }

    // Validate student exists
    const studentRes = await pool.query(
      `select id
       from students
       where id = $1
       limit 1`,
      [student_id],
    );
    if (!studentRes.rows[0]) return reply.code(404).send({ message: "Student not found" });

    try {
      const res = await pool.query(
        `insert into library_locker_assignments (locker_number, student_id, start_date)
         values ($1, $2, coalesce($3::date, current_date))
         returning id, locker_number, student_id, start_date, end_date, status, created_at`,
        [locker_number, student_id, start_date ?? null],
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign locker";
      return reply.code(409).send({ message: msg });
    }
  });

  app.patch("/library/lockers/assignments/:id/end", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const { id } = req.params as { id: string };
    const pool = getPool();

    const res = await pool.query(
      `update library_locker_assignments
       set end_date = current_date,
           status = 'ended',
           updated_at = now()
       where id = $1
         and status = 'active'
         and end_date is null
       returning id, locker_number, student_id, start_date, end_date, status, updated_at`,
      [id],
    );

    const row = res.rows[0];
    if (!row) return reply.code(404).send({ message: "Active assignment not found" });
    return reply.send(row);
  });
}
