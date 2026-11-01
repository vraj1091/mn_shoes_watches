/**
 * The Vercel demo only (DECISIONS.md 76). There, API routes (where Better Auth signs people in) and
 * pages run as separate functions, each with its own copy of the database, so a page cannot find
 * a session that the sign-in saved. The demo therefore carries the session in an encrypted cookie
 * that pages accept without a database lookup, refreshed before it expires.
 *
 * The real shop never does this: switching a staff account off or setting a new password must sign
 * that person out at once, which needs the database check on every request. DATA_SEED_DIR is set
 * only on the demo.
 */
export function demoSessionCookie(maxAge: number) {
  return process.env.DATA_SEED_DIR ? { cookieCache: { enabled: true, maxAge, strategy: "jwe" as const, refreshCache: true } } : {};
}
