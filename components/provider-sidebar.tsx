"use client";

interface Provider {
  id: string;
  name: string;
  status: string;
  stats: { p50: number; p95: number; p99: number; uptime24h: number };
  batch?: { avgTtfb: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  good: "var(--green)",
  fair: "var(--yellow)",
  bad: "var(--red)",
};

export function ProviderSidebar({ providers }: { providers: Provider[] }) {
  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-[22px] pt-[18px] pb-[14px] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-primary">
          Provider Rankings
        </span>
        <span className="text-[11px] text-text-muted">avg TTFB</span>
      </div>

      {providers.map((p, i) => (
        <div
          key={p.id}
          className="flex items-center justify-between px-[22px] py-3.5 border-b border-border-subtle last:border-b-0 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-text-faint font-mono w-4">
              {i + 1}
            </span>
            <span className="text-[13px] font-medium text-text-primary">
              {p.name}
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="text-[11px] font-mono text-text-muted">
              p95 {p.stats.p95 > 0 ? p.stats.p95 : "—"}
            </span>
            <span className="text-[13px] font-mono font-medium text-text-primary min-w-[52px] text-right">
              {(p.batch?.avgTtfb || p.stats.p50) > 0 ? `${p.batch?.avgTtfb || p.stats.p50}ms` : (
                <span style={{ color: "var(--red)" }}>bad</span>
              )}
            </span>
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: STATUS_COLORS[p.status] || "var(--text-faint)" }}
            />
          </div>
        </div>
      ))}

      {providers.length === 0 && (
        <div className="px-[22px] py-8 text-center text-text-muted text-sm">
          Waiting for data...
        </div>
      )}
    </div>
  );
}
