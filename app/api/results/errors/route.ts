import { NextRequest } from "next/server";
import { getRecentErrors } from "@/lib/db/queries";
import { providers as providerConfig } from "@/config/providers";

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  let limit = 50;

  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 200) {
      return Response.json(
        { error: "limit must be between 1 and 200" },
        { status: 400 }
      );
    }
    limit = parsed;
  }

  const errors = await getRecentErrors(limit);

  // Enrich with provider names
  const nameMap = new Map(providerConfig.map((p) => [p.id, p.name]));
  const enriched = errors.map((e) => ({
    ...e,
    providerName: nameMap.get(e.providerId) || e.providerId,
  }));

  return Response.json(enriched, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
