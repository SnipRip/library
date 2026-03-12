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
    } = parsed.data;

    const result = await pool.query(
      `insert into students (
          full_name,
          phone,
          alternate_phone,
          aadhar,
          guardian_name,
          address,
          admission_type,
          status
        )
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id, full_name, phone, admission_type, status, created_at`,
      [
        full_name,
        phone,
        alternate_phone ?? null,
        aadhar ?? null,
        guardian_name ?? null,
        address ?? null,
        admission_type ?? null,
        status,
      ],
    );

    return reply.code(201).send(result.rows[0]);
  });
}
