"use client";

interface Provider {
  id: string;
  name: string;
  status: string;
  stats: { p50: number; p95: number; p99: number; uptime24h: number };
  batch?: { runs: { ttfbMs: number }[]; avgTtfb: number } | null;
}

export function HeroStats({ providers }: { providers: Provider[] }) {
  const withData = providers.filter((p) => (p.batch?.avgTtfb || p.stats.p50) > 0);
  const fastest = withData.length > 0
    ? withData.reduce((best, p) => {
        const val = p.batch?.avgTtfb || p.stats.p50;
        const bestVal = best.batch?.avgTtfb || best.stats.p50;
        return val < bestVal ? p : best;
      })
    : null;

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

  if (!fastest) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-surface border border-border rounded-[10px] shadow-sm p-6 flex items-center gap-5">
        <div className="w-12 h-12 rounded-[10px] bg-green-bg flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" className="w-5 h-5 text-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M13 3l4 4-4 4M3 10h13" />
          </svg>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em]">
            Fastest TTFB
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[36px] font-bold tracking-[-1.5px] text-text-primary font-mono leading-none">
              {fastest.batch?.avgTtfb || fastest.stats.p50}
            </span>
            <span className="text-[14px] font-medium text-text-muted">ms</span>
          </div>
          <div className="text-[12px] text-text-secondary mt-0.5">
            {fastest.name}
          </div>
        </div>
      </div>

      {mostConsistent && (
        <div className="bg-surface border border-border rounded-[10px] shadow-sm p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-[10px] bg-[rgba(99,102,241,0.08)] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" className="w-5 h-5 text-[#6366f1]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 10h2l2-4 3 8 2-4h5" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em]">
              Most Consistent
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[36px] font-bold tracking-[-1.5px] text-text-primary font-mono leading-none">
                ±{Math.round(consistentSpread / 2)}
              </span>
              <span className="text-[14px] font-medium text-text-muted">ms</span>
            </div>
            <div className="text-[12px] text-text-secondary mt-0.5">
              {mostConsistent.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
