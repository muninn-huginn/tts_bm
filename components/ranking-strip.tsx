"use client";

interface BatchRun {
  runIndex: number;
  ttfbMs: number;
  totalTimeMs: number;
}

interface Provider {
  id: string;
  name: string;
  status: string;
  stats: { p50: number; p95: number; p99: number; uptime24h: number };
  latest: { ttfbMs: number; totalTimeMs: number; statusCode: number; timestamp: string } | null;
  batch: { runs: BatchRun[]; avgTtfb: number; avgTotalTime: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  good: "var(--green)",
  fair: "var(--yellow)",
  bad: "var(--red)",
};

const STATUS_BG: Record<string, string> = {
  good: "var(--green-bg)",
  fair: "var(--yellow-bg)",
  bad: "var(--red-bg)",
};

const STATUS_LABEL: Record<string, string> = {
  good: "Good",
  fair: "Fair",
  bad: "Bad",
};

export function RankingStrip({ providers }: { providers: Provider[] }) {
  if (providers.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[10px] p-8 text-center text-text-muted text-sm">
        Waiting for probe data...
      </div>
    );
  }

  return (
    <div className="flex gap-px bg-border rounded-[10px] overflow-x-auto shadow-sm">
      {providers.map((p, i) => {
        const avgTtfb = p.batch?.avgTtfb ?? p.stats.p50;
        const runs = p.batch?.runs || [];

        return (
          <div
            key={p.id}
            className="flex-1 min-w-[180px] bg-surface p-5 relative hover:bg-surface-hover transition-colors first:rounded-l-[10px] last:rounded-r-[10px]"
          >
            <div className="text-[10px] font-semibold text-text-faint font-mono mb-2.5">
              #{i + 1}
            </div>
            <div className="text-[13px] font-semibold text-text-primary mb-0.5">
              {p.name}
            </div>

            {/* Average TTFB */}
            <div className="text-[28px] font-bold tracking-[-1px] text-text-primary font-mono leading-none">
              {avgTtfb > 0 ? (
                <>
                  {avgTtfb}
                  <span className="text-[13px] font-medium text-text-muted tracking-normal ml-0.5">
                    ms
                  </span>
                </>
              ) : (
                "—"
              )}
            </div>
            <div className="text-[10px] text-text-faint mt-0.5">avg of {runs.length || "—"} runs</div>

            {/* Individual runs bar chart */}
            {runs.length > 0 && (
              <div className="flex items-end gap-1 mt-3 h-[28px]">
                {runs.map((run, j) => {
                  const maxTtfb = Math.max(...runs.map((r) => r.ttfbMs), 1);
                  const height = Math.max((run.ttfbMs / maxTtfb) * 100, 8);
                  return (
                    <div key={j} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-t-[2px] transition-all"
                        style={{
                          height: `${height}%`,
                          background: STATUS_COLORS[p.status] || "var(--text-faint)",
                          opacity: 0.6 + j * 0.15,
                        }}
                        title={`Run ${run.runIndex}: ${run.ttfbMs}ms`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {runs.length > 0 && (
              <div className="flex gap-1 mt-1">
                {runs.map((run, j) => (
                  <span key={j} className="flex-1 text-center text-[9px] font-mono text-text-faint">
                    {run.ttfbMs}
                  </span>
                ))}
              </div>
            )}

            {/* Status badge */}
            <div
              className="inline-flex items-center gap-[5px] mt-2.5 text-[11px] font-medium px-2 py-[3px] rounded-full"
              style={{
                color: STATUS_COLORS[p.status] || "var(--text-muted)",
                background: STATUS_BG[p.status] || "var(--surface-hover)",
              }}
            >
              <span
                className="w-[5px] h-[5px] rounded-full"
                style={{ background: STATUS_COLORS[p.status] || "var(--text-muted)" }}
              />
              {STATUS_LABEL[p.status] || "Unknown"}
            </div>

            <div
              className="absolute bottom-0 left-5 right-5 h-[3px] rounded-t-[3px] opacity-80"
              style={{ background: STATUS_COLORS[p.status] || "var(--text-faint)" }}
            />
          </div>
        );
      })}
    </div>
  );
}
