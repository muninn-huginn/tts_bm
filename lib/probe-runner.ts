import { providers } from "@/config/providers";
import { probeConfig } from "@/config/probe";
import { getLastProbeTimestamps } from "@/lib/db/queries";
import { getAdapter } from "@/lib/providers/registry";
import { db } from "@/lib/db";
import { probeResults } from "@/lib/db/schema";

// Import all adapters so they register themselves
import "@/lib/providers/all";

export interface ProbeSummary {
  probed: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Run probes for all providers that are due.
 * Called by the cron endpoint every minute.
 */
export async function runDueProbes(): Promise<ProbeSummary> {
  const summary: ProbeSummary = { probed: [], skipped: [], errors: [] };
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

    // Select phrase (round-robin based on probe count)
    const probeCount = lastTimestamps[provider.id] ? 1 : 0; // simplified
    const phrase =
      enabledPhrases[
        Math.floor(Math.random() * enabledPhrases.length)
      ];

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
      });

      summary.probed.push(provider.id);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      summary.errors.push(`${provider.id}: ${msg}`);

      // Still record the failure
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
        });
      } catch {
        // DB write failed too — just log
      }
    }
  }

  return summary;
}
