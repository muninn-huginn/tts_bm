"use client";

import { useState } from "react";

interface Provider {
  id: string;
  name: string;
  status: string;
  stats: { p50: number; p95: number; p99: number; uptime24h: number };
  latest: { ttfbMs: number; totalTimeMs: number; statusCode: number; timestamp: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  good: "var(--green)",
  fair: "var(--yellow)",
  bad: "var(--red)",
};

const ABBREVIATIONS: Record<string, string> = {
  "cartesia-sonic3": "S3",
  "cartesia-turbo": "ST",
  elevenlabs: "EL",
  deepgram: "Dg",
  fish: "Fs",
};

type SortKey = "p50" | "p95" | "p99" | "totalTime";

export function ComparisonTable({ providers }: { providers: Provider[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("p50");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...providers].sort((a, b) => {
    let aVal: number, bVal: number;
    switch (sortKey) {
      case "p50": aVal = a.stats.p50; bVal = b.stats.p50; break;
      case "p95": aVal = a.stats.p95; bVal = b.stats.p95; break;
      case "p99": aVal = a.stats.p99; bVal = b.stats.p99; break;
      case "totalTime":
        aVal = a.latest?.totalTimeMs || 0;
        bVal = b.latest?.totalTimeMs || 0;
        break;
      default: aVal = 0; bVal = 0;
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const thClass =
    "px-[18px] py-3 text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] text-left border-b border-border bg-bg cursor-pointer select-none hover:text-text-primary transition-colors whitespace-nowrap";
  const thNumClass = thClass + " text-right";

  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass} style={{ width: 180 }}>Provider</th>
            <th className={thNumClass} onClick={() => handleSort("p50")}>
              TTFB p50 {sortKey === "p50" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={thNumClass} onClick={() => handleSort("p95")}>
              TTFB p95 {sortKey === "p95" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={thNumClass} onClick={() => handleSort("p99")}>
              TTFB p99 {sortKey === "p99" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={thNumClass} onClick={() => handleSort("totalTime")}>
              Total Time {sortKey === "totalTime" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={thClass + " text-center"} style={{ width: 60 }}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const rowBg =
              p.status === "fair"
                ? "bg-[rgba(217,119,6,0.02)]"
                : p.status === "bad"
                  ? "bg-[rgba(220,38,38,0.02)]"
                  : "";

            return (
              <tr
                key={p.id}
                className={`border-b border-border-subtle last:border-b-0 hover:bg-surface-hover transition-colors ${rowBg}`}
              >
                <td className="px-[18px] py-3.5 text-[13px] font-semibold">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[6px] bg-bg border border-border flex items-center justify-center text-[12px] font-bold text-text-muted flex-shrink-0">
                      {ABBREVIATIONS[p.id] || p.name.slice(0, 2)}
                    </div>
                    {p.name}
                  </div>
                </td>
                <td className="px-[18px] py-3.5 text-right font-mono text-[12px] font-medium">
                  {p.stats.p50 > 0 ? `${p.stats.p50}ms` : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-[18px] py-3.5 text-right font-mono text-[12px] font-medium">
                  {p.stats.p95 > 0 ? `${p.stats.p95}ms` : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-[18px] py-3.5 text-right font-mono text-[12px] font-medium">
                  {p.stats.p99 > 0 ? `${p.stats.p99}ms` : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-[18px] py-3.5 text-right font-mono text-[12px] font-medium">
                  {p.latest?.totalTimeMs
                    ? p.latest.totalTimeMs >= 1000
                      ? `${(p.latest.totalTimeMs / 1000).toFixed(1)}s`
                      : `${p.latest.totalTimeMs}ms`
                    : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-[18px] py-3.5 text-center">
                  <div
                    className="w-1.5 h-1.5 rounded-full mx-auto"
                    style={{
                      background: STATUS_COLORS[p.status] || "var(--text-faint)",
                    }}
                  />
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-[18px] py-8 text-center text-text-muted text-sm">
                No data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
