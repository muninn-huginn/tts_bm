import { db } from "./index";
import { probeResults } from "./schema";
import { eq, desc, sql, and, gte, lte, or, isNotNull } from "drizzle-orm";
import { providers } from "@/config/providers";
import { probeConfig } from "@/config/probe";

/**
 * Get the most recent probe timestamp for each provider.
 * Used by probe runner to determine which providers are due.
 */
export async function getLastProbeTimestamps(): Promise<
  Record<string, Date>
> {
  const rows = await db
    .select({
      providerId: probeResults.providerId,
      lastTimestamp: sql<string>`max(${probeResults.timestamp})`.as(
        "last_timestamp"
      ),
    })
    .from(probeResults)
    .groupBy(probeResults.providerId);

  const result: Record<string, Date> = {};
  for (const row of rows) {
    if (row.lastTimestamp) {
      result[row.providerId] = new Date(row.lastTimestamp);
    }
  }
  return result;
}

/**
 * Get latest probe result + stats (p50/p95/p99, uptime) per enabled provider.
 */
export async function getLatestResults() {
  const enabledProviders = providers.filter((p) => p.enabled);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const results = await Promise.all(
    enabledProviders.map(async (provider) => {
      // Latest probe
      const [latest] = await db
        .select()
        .from(probeResults)
        .where(eq(probeResults.providerId, provider.id))
        .orderBy(desc(probeResults.timestamp))
        .limit(1);

      // Stats over last hour
      const hourRows = await db
        .select({ ttfbMs: probeResults.ttfbMs })
        .from(probeResults)
        .where(
          and(
            eq(probeResults.providerId, provider.id),
            gte(probeResults.timestamp, oneHourAgo),
            gte(probeResults.statusCode, 200),
            lte(probeResults.statusCode, 299)
          )
        )
        .orderBy(probeResults.ttfbMs);

      const ttfbValues = hourRows.map((r) => r.ttfbMs);
      const p50 = percentile(ttfbValues, 50);
      const p95 = percentile(ttfbValues, 95);
      const p99 = percentile(ttfbValues, 99);

      // Uptime over 24h
      const dayTotal = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(probeResults)
        .where(
          and(
            eq(probeResults.providerId, provider.id),
            gte(probeResults.timestamp, oneDayAgo)
          )
        );

      const dayErrors = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(probeResults)
        .where(
          and(
            eq(probeResults.providerId, provider.id),
            gte(probeResults.timestamp, oneDayAgo),
            or(
              gte(probeResults.statusCode, 400),
              eq(probeResults.statusCode, 0)
            )
          )
        );

      const total = dayTotal[0]?.count || 0;
      const errors = dayErrors[0]?.count || 0;
      const uptime24h = total > 0 ? Math.round(((total - errors) / total) * 10000) / 100 : 0;

      // Error rate last hour
      const hourTotal = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(probeResults)
        .where(
          and(
            eq(probeResults.providerId, provider.id),
            gte(probeResults.timestamp, oneHourAgo)
          )
        );
      const hourErrors = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(probeResults)
        .where(
          and(
            eq(probeResults.providerId, provider.id),
            gte(probeResults.timestamp, oneHourAgo),
            or(
              gte(probeResults.statusCode, 400),
              eq(probeResults.statusCode, 0)
            )
          )
        );
      const hourErrorRate =
        (hourTotal[0]?.count || 0) > 0
          ? (hourErrors[0]?.count || 0) / (hourTotal[0]?.count || 1)
          : 0;

      // Last 3 probes for "down" check
      const last3 = await db
        .select({ statusCode: probeResults.statusCode })
        .from(probeResults)
        .where(eq(probeResults.providerId, provider.id))
        .orderBy(desc(probeResults.timestamp))
        .limit(3);

      return {
        id: provider.id,
        name: provider.name,
        latest: latest
          ? {
              ttfbMs: latest.ttfbMs,
              totalTimeMs: latest.totalTimeMs,
              statusCode: latest.statusCode,
              timestamp: latest.timestamp.toISOString(),
            }
          : null,
        stats: { p50, p95, p99, uptime24h },
        _errorRate: hourErrorRate,
        _last3: last3.map((r) => r.statusCode),
      };
    })
  );

  return results;
}

/**
 * Get time-series data for charts.
 */
export async function getHistory(
  providerIds: string[],
  start: Date,
  end: Date
) {
  const rangeMs = end.getTime() - start.getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const oneDay = 24 * 60 * 60 * 1000;

  // For ranges > 7 days, aggregate into 1-hour buckets
  // For ranges > 1 day, aggregate into 5-min buckets
  // Otherwise return raw data
  if (rangeMs > sevenDays) {
    return getAggregatedHistory(providerIds, start, end, "1 hour");
  } else if (rangeMs > oneDay) {
    return getAggregatedHistory(providerIds, start, end, "5 minutes");
  }

  // Raw data
  const rows = await db
    .select({
      providerId: probeResults.providerId,
      timestamp: probeResults.timestamp,
      ttfbMs: probeResults.ttfbMs,
      totalTimeMs: probeResults.totalTimeMs,
      statusCode: probeResults.statusCode,
    })
    .from(probeResults)
    .where(
      and(
        sql`${probeResults.providerId} = ANY(${providerIds})`,
        gte(probeResults.timestamp, start),
        lte(probeResults.timestamp, end),
        gte(probeResults.statusCode, 200),
        lte(probeResults.statusCode, 299)
      )
    )
    .orderBy(probeResults.timestamp);

  // Group by provider
  const grouped: Record<
    string,
    { timestamp: string; ttfbMs: number; totalTimeMs: number }[]
  > = {};
  for (const row of rows) {
    if (!grouped[row.providerId]) grouped[row.providerId] = [];
    grouped[row.providerId].push({
      timestamp: row.timestamp.toISOString(),
      ttfbMs: row.ttfbMs,
      totalTimeMs: row.totalTimeMs,
    });
  }

  return providerIds.map((id) => ({
    providerId: id,
    points: grouped[id] || [],
  }));
}

async function getAggregatedHistory(
  providerIds: string[],
  start: Date,
  end: Date,
  bucket: string
) {
  const rows = await db.execute(sql`
    SELECT
      provider_id,
      date_trunc(${bucket}, timestamp) as bucket_time,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY ttfb_ms) as p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY ttfb_ms) as p95,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY ttfb_ms) as p99
    FROM probe_results
    WHERE provider_id = ANY(${providerIds})
      AND timestamp >= ${start.toISOString()}
      AND timestamp <= ${end.toISOString()}
      AND status_code >= 200
      AND status_code < 300
    GROUP BY provider_id, bucket_time
    ORDER BY bucket_time
  `);

  const grouped: Record<
    string,
    { timestamp: string; ttfbMs: number; p95: number; p99: number }[]
  > = {};
  for (const row of rows.rows) {
    const r = row as Record<string, unknown>;
    const pid = r.provider_id as string;
    if (!grouped[pid]) grouped[pid] = [];
    grouped[pid].push({
      timestamp: (r.bucket_time as Date).toISOString(),
      ttfbMs: Math.round(r.p50 as number),
      p95: Math.round(r.p95 as number),
      p99: Math.round(r.p99 as number),
    });
  }

  return providerIds.map((id) => ({
    providerId: id,
    points: grouped[id] || [],
  }));
}

/**
 * Get recent errors across all providers.
 */
export async function getRecentErrors(limit: number = 50) {
  const rows = await db
    .select({
      providerId: probeResults.providerId,
      timestamp: probeResults.timestamp,
      statusCode: probeResults.statusCode,
      errorMessage: probeResults.errorMessage,
    })
    .from(probeResults)
    .where(
      or(
        gte(probeResults.statusCode, 400),
        eq(probeResults.statusCode, 0),
        isNotNull(probeResults.errorMessage)
      )
    )
    .orderBy(desc(probeResults.timestamp))
    .limit(limit);

  return rows.map((row) => ({
    providerId: row.providerId,
    timestamp: row.timestamp.toISOString(),
    statusCode: row.statusCode,
    errorMessage: row.errorMessage,
  }));
}

/**
 * Get uptime ticks for the last 24 hours (for uptime bar visualization).
 * Returns hourly buckets with status.
 */
export async function getUptimeTicks(providerId: string) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db.execute(sql`
    SELECT
      date_trunc('hour', timestamp) as hour,
      count(*) as total,
      count(*) FILTER (WHERE status_code >= 400 OR status_code = 0) as errors
    FROM probe_results
    WHERE provider_id = ${providerId}
      AND timestamp >= ${oneDayAgo.toISOString()}
    GROUP BY hour
    ORDER BY hour
  `);

  return rows.rows.map((r) => {
    const row = r as Record<string, unknown>;
    const total = Number(row.total);
    const errors = Number(row.errors);
    const ratio = total > 0 ? errors / total : 0;
    return {
      hour: (row.hour as Date).toISOString(),
      status: ratio === 0 ? "ok" : ratio < 0.5 ? "partial" : "fail",
    };
  });
}

/**
 * Get the latest batch of probe results per provider.
 * Returns individual runs + average for the most recent batch.
 */
export async function getLatestBatchRuns() {
  const enabledProviders = providers.filter((p) => p.enabled);

  const results = await Promise.all(
    enabledProviders.map(async (provider) => {
      // Get the latest batch_id for this provider
      const [latestRow] = await db
        .select({ batchId: probeResults.batchId })
        .from(probeResults)
        .where(
          and(
            eq(probeResults.providerId, provider.id),
            isNotNull(probeResults.batchId)
          )
        )
        .orderBy(desc(probeResults.timestamp))
        .limit(1);

      if (!latestRow?.batchId) return { providerId: provider.id, runs: [], avgTtfb: 0, avgTotalTime: 0 };

      const runs = await db
        .select({
          runIndex: probeResults.runIndex,
          ttfbMs: probeResults.ttfbMs,
          totalTimeMs: probeResults.totalTimeMs,
          statusCode: probeResults.statusCode,
          errorMessage: probeResults.errorMessage,
          timestamp: probeResults.timestamp,
        })
        .from(probeResults)
        .where(
          and(
            eq(probeResults.providerId, provider.id),
            eq(probeResults.batchId, latestRow.batchId)
          )
        )
        .orderBy(probeResults.runIndex);

      const successful = runs.filter((r) => r.statusCode >= 200 && r.statusCode < 300);
      const avgTtfb = successful.length > 0
        ? Math.round(successful.reduce((s, r) => s + r.ttfbMs, 0) / successful.length)
        : 0;
      const avgTotalTime = successful.length > 0
        ? Math.round(successful.reduce((s, r) => s + r.totalTimeMs, 0) / successful.length)
        : 0;

      return {
        providerId: provider.id,
        runs: runs.map((r) => ({
          runIndex: r.runIndex,
          ttfbMs: r.ttfbMs,
          totalTimeMs: r.totalTimeMs,
          statusCode: r.statusCode,
          errorMessage: r.errorMessage,
          timestamp: r.timestamp.toISOString(),
        })),
        avgTtfb,
        avgTotalTime,
      };
    })
  );

  return results;
}

// Helper: calculate percentile from sorted array
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return Math.round(
    sorted[lower] * (upper - index) + sorted[upper] * (index - lower)
  );
}
