import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const UserDocSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.number().int().nonnegative(),
  lastModified: z.number().int().nonnegative(),
});

const CreateUserSchema = z.object({
  username: z.string().trim().min(1).max(100),
  email: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
  role: z.string().trim().min(1).max(50).optional().default("user"),

  original_name: z.string().trim().max(200).optional().nullable(),
  first_name: z.string().trim().max(100).optional().nullable(),
  last_name: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  alternate_phone: z.string().trim().max(50).optional().nullable(),
  pan: z.string().trim().max(50).optional().nullable(),
  aadhar: z.string().trim().max(50).optional().nullable(),
  documents: z.array(UserDocSchema).optional().nullable(),
});

const UpdateUserSchema = z.object({
  username: z.string().trim().min(1).max(100),
  email: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(50),
  is_active: z.boolean(),

  original_name: z.string().trim().max(200).optional().nullable(),
  first_name: z.string().trim().max(100).optional().nullable(),
  last_name: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  alternate_phone: z.string().trim().max(50).optional().nullable(),
  pan: z.string().trim().max(50).optional().nullable(),
  aadhar: z.string().trim().max(50).optional().nullable(),
  documents: z.array(UserDocSchema).optional().nullable(),
});

function isUniqueViolation(err: unknown) {
  const e = err as { code?: string } | null;
  return !!e && e.code === "23505";
}

export async function registerUserRoutes(app: FastifyInstance) {
  app.get("/users", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    if (auth.user.role !== "admin" && auth.user.role !== "owner") {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const pool = getPool();
    const res = await pool.query(
      `select
         id,
         username,
         email,
         role,
         is_active,
         created_at,
         original_name,
         first_name,
         last_name,
         address,
         phone,
         alternate_phone,
         pan,
         aadhar,
         documents
       from users
       where deleted_at is null
       order by created_at desc`,
    );

    return reply.send(
      res.rows.map((r) => ({
        id: String(r.id),
        username: r.username ?? "",
        email: r.email ?? "",
        role: r.role ?? "user",
        is_active: Boolean(r.is_active),
        created_at: (r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)) as string,
        original_name: r.original_name ?? "",
        first_name: r.first_name ?? "",
        last_name: r.last_name ?? "",
        address: r.address ?? "",
        phone: r.phone ?? "",
        alternate_phone: r.alternate_phone ?? "",
        pan: r.pan ?? "",
        aadhar: r.aadhar ?? "",
        documents: r.documents ?? [],
      })),
    );
  });

  app.post("/users", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    if (auth.user.role !== "admin" && auth.user.role !== "owner") {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const data = parsed.data;
    const pool = getPool();

    try {
      const res = await pool.query(
        `insert into users (
           username,
           email,
           password_hash,
           role,
           original_name,
           first_name,
           last_name,
           address,
           phone,
           alternate_phone,
           pan,
           aadhar,
           documents
         )
         values (
           $1,
           $2,
           crypt($3, gen_salt('bf')),
           $4,
           $5,
           $6,
           $7,
           $8,
           $9,
           $10,
           $11,
           $12,
           $13
         )
         returning id, username, email, role, created_at`,
        [
          data.username,
          data.email,
          data.password,
          data.role,
          data.original_name ?? null,
          data.first_name ?? null,
          data.last_name ?? null,
          data.address ?? null,
          data.phone ?? null,
          data.alternate_phone ?? null,
          data.pan ?? null,
          data.aadhar ?? null,
          data.documents ?? null,
        ],
      );

      const row = res.rows[0] as any;
      return reply.code(201).send({
        id: String(row.id),
        username: row.username,
        email: row.email,
        role: row.role,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return reply.code(409).send({ message: "User already exists" });
      }
      req.log.error({ err }, "Failed to create user");
      return reply.code(500).send({ message: "Failed to create user" });
    }
  });

  app.put("/users/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    if (auth.user.role !== "admin" && auth.user.role !== "owner") {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const parsedParams = paramsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ message: "Invalid params", errors: parsedParams.error.issues });
    }

    const parsed = UpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const userId = parsedParams.data.id;
    const data = parsed.data;
    const pool = getPool();

    // Prevent users from making their own account inactive.
    if (auth.user.id === userId && data.is_active === false) {
      return reply.code(400).send({ message: "You cannot deactivate your own account" });
    }

    // Ensure the system always has at least one active admin/owner.
    const isPrivilegedRoleAfter = data.role === "admin" || data.role === "owner";
    const isActivePrivilegedAfter = isPrivilegedRoleAfter && data.is_active === true;

    const activeAdminsExcludingTargetRes = await pool.query(
      `select count(*)::int as count
       from users
       where is_active = true
         and deleted_at is null
         and role in ('admin', 'owner')
         and id <> $1`,
      [userId],
    );
    const activeAdminsExcludingTarget = Number(activeAdminsExcludingTargetRes.rows[0]?.count ?? 0);

    if (activeAdminsExcludingTarget === 0 && !isActivePrivilegedAfter) {
      return reply.code(400).send({ message: "At least one active admin/owner must remain" });
    }

    try {
      const res = await pool.query(
        `update users
         set
           username = $2,
           email = $3,
           role = $4,
           is_active = $5,
           original_name = $6,
           first_name = $7,
           last_name = $8,
           address = $9,
           phone = $10,
           alternate_phone = $11,
           pan = $12,
           aadhar = $13,
           documents = $14,
           updated_at = now()
         where id = $1
           and deleted_at is null
         returning id, username, email, role, is_active, created_at, updated_at`,
        [
          userId,
          data.username,
          data.email,
          data.role,
          data.is_active,
          data.original_name ?? null,
          data.first_name ?? null,
          data.last_name ?? null,
          data.address ?? null,
          data.phone ?? null,
          data.alternate_phone ?? null,
          data.pan ?? null,
          data.aadhar ?? null,
          data.documents ?? null,
        ],
      );

      const row = res.rows[0] as any;
      if (!row) return reply.code(404).send({ message: "User not found" });

      return reply.send({
        id: String(row.id),
        username: row.username,
        email: row.email,
        role: row.role,
        is_active: Boolean(row.is_active),
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return reply.code(409).send({ message: "Username or email already exists" });
      }
      req.log.error({ err }, "Failed to update user");
      return reply.code(500).send({ message: "Failed to update user" });
    }
  });

  app.delete("/users/:id", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    if (auth.user.role !== "admin" && auth.user.role !== "owner") {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const parsedParams = paramsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ message: "Invalid params", errors: parsedParams.error.issues });
    }

    const userId = parsedParams.data.id;

    if (auth.user.id === userId) {
      return reply.code(400).send({ message: "You cannot delete your own account" });
    }

    const pool = getPool();

    await pool.query("begin");
    try {
      const targetRes = await pool.query(
        `select id, role, is_active
         from users
         where id = $1
           and deleted_at is null
         limit 1`,
        [userId],
      );
      const target = targetRes.rows[0] as { id: string; role: string; is_active: boolean } | undefined;
      if (!target) {
        await pool.query("rollback");
        return reply.code(404).send({ message: "User not found" });
      }

      const isTargetPrivilegedActive =
        target.is_active === true && (target.role === "admin" || target.role === "owner");

      if (isTargetPrivilegedActive) {
        const remainingPrivilegedRes = await pool.query(
          `select count(*)::int as count
           from users
           where is_active = true
             and deleted_at is null
             and role in ('admin', 'owner')
             and id <> $1`,
          [userId],
        );
        const remaining = Number(remainingPrivilegedRes.rows[0]?.count ?? 0);
        if (remaining === 0) {
          await pool.query("rollback");
          return reply.code(400).send({ message: "At least one active admin/owner must remain" });
        }
      }

      // Soft delete: keep user row (and therefore history) intact.
      await pool.query(
        `update users
         set deleted_at = now(),
             is_active = false,
             updated_at = now()
         where id = $1
           and deleted_at is null`,
        [userId],
      );

      // Drop active sessions so the user is logged out immediately.
      await pool.query(`delete from sessions where user_id = $1`, [userId]);

      await pool.query("commit");
      return reply.send({ ok: true });
    } catch (err) {
      await pool.query("rollback");
      req.log.error({ err }, "Failed to delete user");
      return reply.code(500).send({ message: "Failed to delete user" });
    }
  });
}
