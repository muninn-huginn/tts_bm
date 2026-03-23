import { randomUUID } from "crypto";
import { providers } from "@/config/providers";
import { probeConfig } from "@/config/probe";
import { getLastProbeTimestamps } from "@/lib/db/queries";
import { getAdapter } from "@/lib/providers/registry";
import { db } from "@/lib/db";
import { probeResults } from "@/lib/db/schema";

// Import all adapters so they register themselves
import "@/lib/providers/all";

const RUNS_PER_PROBE = 3;

export interface ProviderProbeSummary {
  id: string;
  runs: { ttfbMs: number; totalTimeMs: number; statusCode: number; error: string | null }[];
  avgTtfb: number;
}

export interface ProbeSummary {
  batchId: string;
  probed: ProviderProbeSummary[];
  skipped: string[];
  errors: string[];
}

/**
 * Run probes for all providers that are due.
 * Each provider is probed RUNS_PER_PROBE times per invocation.
 */
export async function runDueProbes(): Promise<ProbeSummary> {
  const batchId = randomUUID();
  const summary: ProbeSummary = { batchId, probed: [], skipped: [], errors: [] };
  const now = Date.now();

  const lastTimestamps = await getLastProbeTimestamps();
  const enabledProviders = providers.filter((p) => p.enabled);
  const enabledPhrases = probeConfig.phrases;

  if (enabledPhrases.length === 0) {
    return summary;
  }

  for (const provider of enabledProviders) {
    const lastProbe = lastTimestamps[provider.id];
    const interval = provider.probeIntervalSeconds * 1000;

    // Skip if not enough time has elapsed
    if (lastProbe && now - lastProbe.getTime() < interval) {
      summary.skipped.push(provider.id);
      continue;
    }

    const adapter = getAdapter(provider.adapter);
    if (!adapter) {
      summary.errors.push(`${provider.id}: no adapter "${provider.adapter}"`);
      continue;
    }

    const phrase = enabledPhrases[Math.floor(Math.random() * enabledPhrases.length)];
    const providerSummary: ProviderProbeSummary = {
      id: provider.id,
      runs: [],
      avgTtfb: 0,
    };

    for (let i = 0; i < RUNS_PER_PROBE; i++) {
      try {
        const result = await adapter.probe(phrase.text, provider.config);

        await db.insert(probeResults).values({
          providerId: provider.id,
          phraseLabel: phrase.label,
          ttfbMs: result.ttfbMs,
          totalTimeMs: result.totalTimeMs,
          audioDurationMs: result.audioDurationMs,
          statusCode: result.statusCode,
          errorMessage: result.errorMessage,
          region: process.env.VERCEL_REGION || "local",
          batchId,
          runIndex: i + 1,
        });

        providerSummary.runs.push({
          ttfbMs: result.ttfbMs,
          totalTimeMs: result.totalTimeMs,
          statusCode: result.statusCode,
          error: result.errorMessage,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";

        try {
          await db.insert(probeResults).values({
            providerId: provider.id,
            phraseLabel: phrase.label,
            ttfbMs: 0,
            totalTimeMs: 0,
            audioDurationMs: null,
            statusCode: 0,
            errorMessage: msg,
            region: process.env.VERCEL_REGION || "local",
            batchId,
            runIndex: i + 1,
          });
        } catch {
          // DB write failed too
        }

        providerSummary.runs.push({
          ttfbMs: 0,
          totalTimeMs: 0,
          statusCode: 0,
          error: msg,
        });
      }
    }

    // Calculate average TTFB from successful runs
    const successfulRuns = providerSummary.runs.filter((r) => r.statusCode >= 200 && r.statusCode < 300);
    providerSummary.avgTtfb =
      successfulRuns.length > 0
        ? Math.round(successfulRuns.reduce((sum, r) => sum + r.ttfbMs, 0) / successfulRuns.length)
        : 0;

    summary.probed.push(providerSummary);
  }

  return summary;
}
