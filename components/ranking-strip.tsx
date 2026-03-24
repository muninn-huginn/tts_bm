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
  good: "#00A861",
  fair: "#D97706",
  bad: "#DC2626",
};

const STATUS_BG: Record<string, string> = {
  good: "rgba(0, 168, 97, 0.08)",
  fair: "rgba(217, 119, 6, 0.08)",
  bad: "rgba(220, 38, 38, 0.08)",
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {providers.map((p, i) => {
        const avgTtfb = p.batch?.avgTtfb ?? p.stats.p50;
        const runs = p.batch?.runs || [];
        const color = STATUS_COLORS[p.status] || "#999";

        return (
          <div
            key={p.id}
            className="bg-surface border border-border rounded-[10px] p-5 relative hover:shadow-md transition-shadow overflow-hidden"
          >
            {/* Top accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: color }}
            />

            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-text-faint font-mono">
                #{i + 1}
              </span>
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ color, background: STATUS_BG[p.status] || "transparent" }}
              >
                {STATUS_LABEL[p.status] || "—"}
              </span>
            </div>

            <div className="text-[12px] font-semibold text-text-primary mb-1 truncate">
              {p.name}
            </div>

            <div className="text-[32px] font-bold tracking-[-1.5px] text-text-primary font-mono leading-none">
              {avgTtfb > 0 ? avgTtfb : "—"}
              {avgTtfb > 0 && (
                <span className="text-[14px] font-medium text-text-muted tracking-normal ml-0.5">
                  ms
                </span>
              )}
            </div>

            {/* Run bars */}
            {runs.length > 0 && (
              <div className="mt-4">
                <div className="flex items-end gap-[3px] h-[32px]">
                  {runs.map((run, j) => {
                    const maxTtfb = Math.max(...runs.map((r) => r.ttfbMs), 1);
                    const height = Math.max((run.ttfbMs / maxTtfb) * 100, 12);
                    return (
                      <div
                        key={j}
                        className="flex-1 rounded-[3px] transition-all"
                        style={{
                          height: `${height}%`,
                          background: color,
                          opacity: 0.25 + j * 0.25,
                        }}
                        title={`Run ${run.runIndex}: ${run.ttfbMs}ms`}
                      />
                    );
                  })}
                </div>
                <div className="flex gap-[3px] mt-1.5">
                  {runs.map((run, j) => (
                    <span
                      key={j}
                      className="flex-1 text-center text-[9px] font-mono text-text-faint"
                    >
                      {run.ttfbMs}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
