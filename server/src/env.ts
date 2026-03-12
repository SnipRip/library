import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  ENABLE_DEV_AUTH: z
    .string()
    .optional()
    .transform((v) => (v ?? "true").toLowerCase() === "true"),
});

export type ServerEnv = z.infer<typeof EnvSchema>;

export function getEnv(): ServerEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(message);
  }
  return parsed.data;
}
