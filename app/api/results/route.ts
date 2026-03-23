import { getLatestResults, getLatestBatchRuns } from "@/lib/db/queries";
import { calculateStatus } from "@/lib/status";

export async function GET() {
  const [results, batchRuns] = await Promise.all([
    getLatestResults(),
    getLatestBatchRuns(),
  ]);

  const batchMap = new Map(batchRuns.map((b) => [b.providerId, b]));

  const response = {
    providers: results.map((r) => {
      const status =
        r.stats.p50 > 0 || r._last3.length > 0
          ? calculateStatus(r.stats.p50, r._errorRate, r._last3)
          : "unknown";

      const batch = batchMap.get(r.id);

      return {
        id: r.id,
        name: r.name,
        status,
        latest: r.latest,
        stats: r.stats,
        batch: batch
          ? {
              runs: batch.runs.map((run) => ({
                runIndex: run.runIndex,
                ttfbMs: run.ttfbMs,
                totalTimeMs: run.totalTimeMs,
              })),
              avgTtfb: batch.avgTtfb,
              avgTotalTime: batch.avgTotalTime,
            }
          : null,
      };
    }),
    updatedAt: new Date().toISOString(),
  };

  return Response.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
