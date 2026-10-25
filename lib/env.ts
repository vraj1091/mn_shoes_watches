import "server-only";
import { z } from "zod";

const base64Key = z
  .string()
  .refine((value) => Buffer.from(value, "base64").length === 32, "must be 32 bytes, base64-encoded");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  APP_ENCRYPTION_KEY: base64Key,
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(3).optional(),
  // "outbox" writes emails to DATA_DIR/outbox instead of sending them. For automated tests only.
  EMAIL_TRANSPORT: z.enum(["smtp", "outbox"]).default("smtp"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Validated server environment. Read lazily so `next build` works on a machine that has no
 * secrets (for example a GitHub Actions build that is uploaded to the host afterwards).
 */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment variables. Check .env against .env.example:\n${problems.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}
