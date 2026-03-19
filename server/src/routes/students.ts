import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const CreateStudentSchema = z.object({
  // dashboard modal sends `name`, but other clients may send `full_name`
  name: z.string().min(1).optional(),
  full_name: z.string().min(1).optional(),
  phone: z.string().min(5),
  alternate_phone: z.string().optional().nullable(),
  aadhar: z.string().optional().nullable(),
  guardian_name: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  admission_type: z.string().optional().nullable(),
  status: z.string().optional().default("active"),
  // New flow: students can join multiple classes
  class_ids: z.array(z.string().uuid()).optional().default([]),
  // Legacy (ignored): older clients may send `class` as a number
  class: z.number().int().optional(),
});

function normalizeStudentName(body: z.infer<typeof CreateStudentSchema>) {
  return (body.full_name ?? body.name ?? "").trim();
}

export async function registerStudentRoutes(app: FastifyInstance) {
  app.get("/students", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const pool = getPool();
    const result = await pool.query(
      `select id, full_name, phone, admission_type, status, created_at
       from students
       order by created_at desc`,
    );
    return reply.send(result.rows);
  });

  app.get("/students/:id/billing-items", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const { id } = req.params as { id: string };
    const pool = getPool();

    const studentRes = await pool.query(
      `select id, full_name, phone
       from students
       where id = $1
       limit 1`,
      [id],
    );
    const student = studentRes.rows[0] as { id: string; full_name: string; phone: string } | undefined;
    if (!student) return reply.code(404).send({ message: "Student not found" });

    const items: Array<{
      id: string;
      desc: string;
      qty: number;
      price: number;
      kind: "library" | "reserved_seat" | "locker" | "class";
    }> = [];

    // Library memberships (active; include upcoming reservations too)
    const membershipsRes = await pool.query(
      `select
        m.id as membership_id,
        sh.name as shift_name,
        ty.name as seat_type_name,
        m.start_date,
        m.end_date,
        m.reserved_seat_id,
        s.seat_number as reserved_seat_number,
        m.reserved_fee,
        coalesce(p.monthly_fee, sh.monthly_fee, 0) as monthly_fee
      from library_memberships m
      join library_shifts sh on sh.id = m.shift_id
      join library_seat_types ty on ty.id = m.seat_type_id
      left join library_seats s on s.id = m.reserved_seat_id
      left join library_shift_pricing p on p.shift_id = m.shift_id and p.seat_type_id = m.seat_type_id
      where m.student_id = $1
        and m.status = 'active'
        and (m.end_date is null or m.end_date >= current_date)
      order by m.created_at desc`,
      [id],
    );

    for (const row of membershipsRes.rows as Array<{
      membership_id: string;
      shift_name: string;
      seat_type_name: string;
      start_date: string;
      end_date: string | null;
      reserved_seat_id: string | null;
      reserved_seat_number: string | null;
      reserved_fee: number | null;
      monthly_fee: number | null;
    }>) {
      const monthlyFee = typeof row.monthly_fee === "number" && Number.isFinite(row.monthly_fee) ? row.monthly_fee : 0;
      items.push({
        id: `lib:${row.membership_id}:monthly`,
        kind: "library",
        desc: `Library Fee - ${row.shift_name} (${row.seat_type_name})`,
        qty: 1,
        price: monthlyFee,
      });

      if (row.reserved_seat_id) {
        const reservedFee =
          typeof row.reserved_fee === "number" && Number.isFinite(row.reserved_fee) ? row.reserved_fee : 0;
        const seatNo = row.reserved_seat_number ? `Seat ${row.reserved_seat_number}` : "Reserved Seat";
        items.push({
          id: `lib:${row.membership_id}:reserved`,
          kind: "reserved_seat",
          desc: `Reserved Seat Fee - ${seatNo} (${row.shift_name})`,
          qty: 1,
          price: reservedFee,
        });
      }
    }

    // Locker assignment (active)
    const lockerRes = await pool.query(
      `select
        a.id as assignment_id,
        a.locker_number,
        s.monthly_fee
       from library_locker_assignments a
       cross join (
         select monthly_fee
         from library_locker_settings
         order by created_at asc
         limit 1
       ) s
       where a.student_id = $1
         and a.status = 'active'
         and a.end_date is null
       order by a.created_at desc
       limit 1`,
      [id],
    );
    const locker = lockerRes.rows[0] as
      | { assignment_id: string; locker_number: number; monthly_fee: number }
      | undefined;
    if (locker) {
      const lockerFee = typeof locker.monthly_fee === "number" && Number.isFinite(locker.monthly_fee) ? locker.monthly_fee : 0;
      items.push({
        id: `locker:${locker.assignment_id}`,
        kind: "locker",
        desc: `Locker Fee - Locker #${locker.locker_number}`,
        qty: 1,
        price: lockerFee,
      });
    }

    // Class enrollments (active)
    const enrollRes = await pool.query(
      `select e.id as enrollment_id, c.name as class_name
       from class_enrollments e
       join classes c on c.id = e.class_id
       where e.student_id = $1
         and e.status = 'active'
         and e.end_date is null
       order by e.created_at desc`,
      [id],
    );

    for (const row of enrollRes.rows as Array<{ enrollment_id: string; class_name: string }>) {
      items.push({
        id: `class:${row.enrollment_id}`,
        kind: "class",
        desc: `Class Fee - ${row.class_name}`,
        qty: 1,
        price: 0,
      });
    }

    return reply.send({ student, items });
  });

  app.post("/students", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const pool = getPool();
    const full_name = normalizeStudentName(parsed.data);
    if (!full_name) return reply.code(400).send({ message: "full_name is required" });

    const {
      phone,
      alternate_phone,
      aadhar,
      guardian_name,
      address,
      admission_type,
      status,
      class_ids,
    } = parsed.data;

    const client = await pool.connect();
    try {
      await client.query("begin");

      const accountRes = await client.query(
        `insert into account_master (entity_type, name, phone, status)
         values ('student', $1, $2, $3)
         returning id`,
        [full_name, phone, status],
      );
      const account_master_id = accountRes.rows[0]?.id as string | undefined;
      if (!account_master_id) throw new Error("Failed to create account master");

      const studentRes = await client.query(
        `insert into students (
            full_name,
            phone,
            account_master_id,
            alternate_phone,
            aadhar,
            guardian_name,
            address,
            admission_type,
            status
          )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning id, full_name, phone, admission_type, status, created_at`,
        [
          full_name,
          phone,
          account_master_id,
          alternate_phone ?? null,
          aadhar ?? null,
          guardian_name ?? null,
          address ?? null,
          admission_type ?? null,
          status,
        ],
      );

      const studentId = studentRes.rows[0]?.id as string | undefined;
      if (studentId) {
        await client.query(
          `update account_master
           set entity_id = $2,
               updated_at = now()
           where id = $1`,
          [account_master_id, studentId],
        );

        if (class_ids && class_ids.length > 0) {
          await client.query(
            `insert into class_enrollments (class_id, student_id)
             select unnest($1::uuid[]), $2::uuid
             on conflict (class_id, student_id)
             where status = 'active' and end_date is null
             do nothing`,
            [class_ids, studentId],
          );
        }
      }

      await client.query("commit");
      return reply.code(201).send(studentRes.rows[0]);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });
}
