"use client";

interface Provider {
  id: string;
  name: string;
  status: string;
  stats: { p50: number; p95: number; p99: number; uptime24h: number };
  batch?: { runs: { ttfbMs: number }[]; avgTtfb: number } | null;
}

export function HeroStats({ providers }: { providers: Provider[] }) {
  // Fastest TTFB (lowest avg)
  const withData = providers.filter((p) => (p.batch?.avgTtfb || p.stats.p50) > 0);
  const fastest = withData.length > 0
    ? withData.reduce((best, p) => {
        const val = p.batch?.avgTtfb || p.stats.p50;
        const bestVal = best.batch?.avgTtfb || best.stats.p50;
        return val < bestVal ? p : best;
      })
    : null;

  // Most consistent (lowest spread between min and max in last batch)
  const withRuns = providers.filter((p) => p.batch && p.batch.runs.length >= 2);
  const mostConsistent = withRuns.length > 0
    ? withRuns.reduce((best, p) => {
        const runs = p.batch!.runs.map((r) => r.ttfbMs).filter((v) => v > 0);
        const bestRuns = best.batch!.runs.map((r) => r.ttfbMs).filter((v) => v > 0);
        const spread = runs.length > 0 ? Math.max(...runs) - Math.min(...runs) : Infinity;
        const bestSpread = bestRuns.length > 0 ? Math.max(...bestRuns) - Math.min(...bestRuns) : Infinity;
        return spread < bestSpread ? p : best;
      })
    : null;

  const consistentSpread = mostConsistent?.batch
    ? (() => {
        const runs = mostConsistent.batch.runs.map((r) => r.ttfbMs).filter((v) => v > 0);
        return runs.length > 0 ? Math.max(...runs) - Math.min(...runs) : 0;
      })()
    : 0;

  if (!fastest) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Fastest TTFB */}
      <div className="bg-surface border border-border rounded-[10px] shadow-sm px-8 py-6 text-center">
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3">
          Fastest TTFB
        </div>
        <div className="text-[48px] font-bold tracking-[-2px] text-text-primary font-mono leading-none">
          {fastest.batch?.avgTtfb || fastest.stats.p50}
          <span className="text-[18px] font-medium text-text-muted tracking-normal ml-1">ms</span>
        </div>
        <div className="text-[13px] text-text-secondary mt-2 font-medium">
          {fastest.name}
        </div>
      </div>

      {/* Most Consistent */}
      {mostConsistent && (
        <div className="bg-surface border border-border rounded-[10px] shadow-sm px-8 py-6 text-center">
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3">
            Most Consistent
          </div>
          <div className="text-[48px] font-bold tracking-[-2px] text-text-primary font-mono leading-none">
            ±{Math.round(consistentSpread / 2)}
            <span className="text-[18px] font-medium text-text-muted tracking-normal ml-1">ms</span>
          </div>
          <div className="text-[13px] text-text-secondary mt-2 font-medium">
            {mostConsistent.name}
          </div>
        </div>
      )}
    </div>
  );
}
