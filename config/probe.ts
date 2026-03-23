export interface ProbePhrase {
  label: string;
  text: string;
}

export const probeConfig = {
  phrases: [
    {
      label: "short",
      text: "The quick brown fox jumps over the lazy dog.",
    },
    {
      label: "medium",
      text: "In a world where technology evolves at breakneck speed, the ability to convert text into natural-sounding speech has become a critical capability for applications ranging from accessibility tools to real-time communication platforms.",
    },
  ] as ProbePhrase[],

  defaultIntervalSeconds: 300,
  retentionDays: 30,
  probeTimeoutMs: 30_000,

  statusThresholds: {
    healthyTtfbMs: 200,
    degradedTtfbMs: 500,
    errorRateHealthy: 0.05,
    errorRateDegraded: 0.2,
  },
};
