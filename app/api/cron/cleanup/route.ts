import { db } from "@/lib/db";
import { probeResults } from "@/lib/db/schema";
import { probeConfig } from "@/config/probe";
import { lt } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(
    Date.now() - probeConfig.retentionDays * 24 * 60 * 60 * 1000
  );

  const result = await db
    .delete(probeResults)
    .where(lt(probeResults.timestamp, cutoff));

  return Response.json({
    deleted: true,
    cutoffDate: cutoff.toISOString(),
  });
}
