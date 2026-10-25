import { connection } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * For the host's health check and uptime monitors. Reports whether the database answers and
 * which journal mode SQLite is using (WAL expected; see DECISIONS.md 21).
 */
export async function GET() {
  await connection();
  const started = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      {
        status: "ok",
        database: { reachable: true, journalMode: prisma.journalMode, latencyMs: Math.round(performance.now() - started) },
        time: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[health] database check failed", error);
    return Response.json(
      { status: "error", database: { reachable: false }, time: new Date().toISOString() },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
