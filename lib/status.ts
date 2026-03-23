import { probeConfig } from "@/config/probe";

const { statusThresholds } = probeConfig;

export type ProviderStatus = "healthy" | "degraded" | "down";

/**
 * Calculate provider status based on TTFB, error rate, and recent probe results.
 */
export function calculateStatus(
  p50: number,
  errorRate: number,
  lastNStatusCodes: number[]
): ProviderStatus {
  // Down: last 3 probes all failed
  if (
    lastNStatusCodes.length >= 3 &&
    lastNStatusCodes
      .slice(0, 3)
      .every((code) => code >= 400 || code === 0)
  ) {
    return "down";
  }

  // Down: high error rate or very high TTFB
  if (
    errorRate > statusThresholds.errorRateDegraded ||
    p50 >= statusThresholds.degradedTtfbMs
  ) {
    return "down";
  }

  // Degraded: moderate error rate or elevated TTFB
  if (
    errorRate > statusThresholds.errorRateHealthy ||
    p50 >= statusThresholds.healthyTtfbMs
  ) {
    return "degraded";
  }

  return "healthy";
}
