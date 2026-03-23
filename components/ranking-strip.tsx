"use client";

interface Provider {
  id: string;
  name: string;
  status: string;
  stats: { p50: number; p95: number; p99: number; uptime24h: number };
  latest: { ttfbMs: number; totalTimeMs: number; statusCode: number; timestamp: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "var(--green)",
  degraded: "var(--yellow)",
  down: "var(--red)",
};

const STATUS_BG: Record<string, string> = {
  healthy: "var(--green-bg)",
  degraded: "var(--yellow-bg)",
  down: "var(--red-bg)",
};

export function RankingStrip({ providers }: { providers: Provider[] }) {
  if (providers.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[10px] p-8 text-center text-text-muted text-sm">
        Waiting for probe data...
      </div>
    );
  }

  // Show top 5 on mobile, all on desktop
  const displayed = providers.slice(0, 10);

  return (
    <div className="flex gap-px bg-border rounded-[10px] overflow-x-auto shadow-sm">
      {displayed.map((p, i) => (
        <div
          key={p.id}
          className="flex-1 min-w-[140px] bg-surface p-5 relative hover:bg-surface-hover transition-colors first:rounded-l-[10px] last:rounded-r-[10px]"
        >
          <div className="text-[10px] font-semibold text-text-faint font-mono mb-2.5">
            #{i + 1}
          </div>
          <div className="text-[13px] font-semibold text-text-primary mb-0.5">
            {p.name}
          </div>
          <div className="text-[28px] font-bold tracking-[-1px] text-text-primary font-mono leading-none">
            {p.stats.p50 > 0 ? (
              <>
                {p.stats.p50}
                <span className="text-[13px] font-medium text-text-muted tracking-normal ml-0.5">
                  ms
                </span>
              </>
            ) : (
              "—"
            )}
          </div>
          <div
            className="inline-flex items-center gap-[5px] mt-2.5 text-[11px] font-medium px-2 py-[3px] rounded-full"
            style={{
              color: STATUS_COLORS[p.status] || "var(--text-muted)",
              background: STATUS_BG[p.status] || "var(--surface-hover)",
            }}
          >
            <span
              className="w-[5px] h-[5px] rounded-full"
              style={{
                background: STATUS_COLORS[p.status] || "var(--text-muted)",
              }}
            />
            {p.status === "healthy"
              ? "Healthy"
              : p.status === "degraded"
                ? "Degraded"
                : p.status === "down"
                  ? "Down"
                  : "Unknown"}
          </div>
          <div
            className="absolute bottom-0 left-5 right-5 h-[3px] rounded-t-[3px] opacity-80"
            style={{
              background: STATUS_COLORS[p.status] || "var(--text-faint)",
            }}
          />
        </div>
      ))}
    </div>
  );
}
