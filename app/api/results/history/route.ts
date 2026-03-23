import { NextRequest } from "next/server";
import { getHistory } from "@/lib/db/queries";
import { providers as providerConfig } from "@/config/providers";

const RANGE_MAP: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  // Parse provider param
  const providerParam = searchParams.get("provider") || "all";
  const validIds = new Set(providerConfig.filter((p) => p.enabled).map((p) => p.id));
  let providerIds: string[];

  if (providerParam === "all") {
    providerIds = Array.from(validIds);
  } else {
    providerIds = providerParam.split(",").filter((id) => validIds.has(id));
    if (providerIds.length === 0) {
      return Response.json({ error: "Invalid provider ID(s)" }, { status: 400 });
    }
  }

  // Parse time range
  const rangeParam = searchParams.get("range");
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  let start: Date;
  let end: Date = new Date();

  if (startParam && endParam) {
    start = new Date(startParam);
    end = new Date(endParam);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return Response.json({ error: "Invalid date format" }, { status: 400 });
    }
  } else if (rangeParam && RANGE_MAP[rangeParam]) {
    start = new Date(Date.now() - RANGE_MAP[rangeParam]);
  } else {
    start = new Date(Date.now() - RANGE_MAP["1h"]); // default 1h
  }

  const data = await getHistory(providerIds, start, end);

  return Response.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
