import crypto from "node:crypto";
import { getPool } from "../db/pool.js";

export type SessionUser = {
  id: string;
  username: string;
  role: string;
};

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function getUserBySessionToken(token: string): Promise<SessionUser | null> {
  const pool = getPool();
  const result = await pool.query(
    `select u.id, u.username, u.role
     from sessions s
     join users u on u.id = s.user_id
     where s.token = $1
       and s.expires_at > now()
       and u.is_active = true
       and u.deleted_at is null
     limit 1`,
    [token],
  );

  return (result.rows[0] as SessionUser | undefined) ?? null;
}

export async function createSession(userId: string, token: string, expiresAt: Date) {
  const pool = getPool();
  await pool.query(
    `insert into sessions (user_id, token, expires_at)
     values ($1, $2, $3)`,
    [userId, token, expiresAt.toISOString()],
  );
}
