import { getLatestResults } from "@/lib/db/queries";
import { calculateStatus } from "@/lib/status";
import { providers as providerConfig } from "@/config/providers";

export async function GET() {
  const results = await getLatestResults();

  const response = {
    providers: results.map((r) => {
      const status = r.stats.p50 > 0 || r._last3.length > 0
        ? calculateStatus(r.stats.p50, r._errorRate, r._last3)
        : "unknown";

      return {
        id: r.id,
        name: r.name,
        status,
        latest: r.latest,
        stats: r.stats,
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
