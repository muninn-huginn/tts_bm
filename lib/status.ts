import { probeConfig } from "@/config/probe";

const { statusThresholds } = probeConfig;

export type ProviderStatus = "good" | "fair" | "bad";

/**
 * Calculate provider status based on TTFB, error rate, and recent probe results.
 */
export function calculateStatus(
  p50: number,
  errorRate: number,
  lastNStatusCodes: number[]
): ProviderStatus {
  // Bad: last 3 probes all failed
  if (
    lastNStatusCodes.length >= 3 &&
    lastNStatusCodes.slice(0, 3).every((code) => code >= 400 || code === 0)
  ) {
    return "bad";
  }

  // Bad: high error rate or very high TTFB
  if (
    errorRate > statusThresholds.errorRateFair ||
    p50 >= statusThresholds.fairTtfbMs
  ) {
    return "bad";
  }

  // Fair: moderate error rate or elevated TTFB
  if (
    errorRate > statusThresholds.errorRateGood ||
    p50 >= statusThresholds.goodTtfbMs
  ) {
    return "fair";
  }

  return "good";
}
