export const dynamic = "force-dynamic";

/**
 * Health check. The app itself is database-free; the DB ping is optional and is
 * only performed when DATABASE_URL is configured (local sandbox).
 */
export async function GET() {
  if (!process.env.DATABASE_URL || process.env.VERCEL) {
    return Response.json({ ok: true, db: "skipped" });
  }
  try {
    const [{ db }, { sql }] = await Promise.all([
      import("@/db"),
      import("drizzle-orm"),
    ]);
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: "up" });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
