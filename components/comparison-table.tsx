"use client";

import { useState } from "react";

interface BatchRun {
  runIndex: number;
  ttfbMs: number;
  totalTimeMs: number;
}

interface Provider {
  id: string;
  name: string;
  status: string;
  stats: { min: number; avg: number; p50: number; p95: number; p99: number; uptime24h: number };
  latest: { ttfbMs: number; totalTimeMs: number; statusCode: number; timestamp: string } | null;
  batch?: { runs: BatchRun[]; avgTtfb: number; avgTotalTime: number } | null;
}

const ABBREVIATIONS: Record<string, string> = {
  "cartesia-sonic3": "S3",
  "cartesia-turbo": "ST",
  elevenlabs: "EL",
  deepgram: "Dg",
  fish: "Fs",
  mistral: "Mi",
  "smallest-lightning": "SL",
};

type SortKey = "min" | "avg" | "p50" | "p95" | "p99" | "spread";

/**
 * Absolute thresholds for TTFB heatmap:
 * Green < 300ms, Orange 300–500ms, Red > 500ms
 */
function heatColor(value: number): string {
  if (value === 0) return "var(--surface)";
  if (value < 300) return "rgba(0, 168, 97, 0.15)";
  if (value < 500) return "rgba(217, 119, 6, 0.15)";
  return "rgba(220, 38, 38, 0.18)";
}

function heatTextColor(value: number): string {
  if (value === 0) return "var(--text-muted)";
  if (value < 300) return "#056b3a";
  if (value < 500) return "#92400e";
  return "#991b1b";
}

export function ComparisonTable({ providers }: { providers: Provider[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("min");
  const [sortAsc, setSortAsc] = useState(true);

  // Compute derived values
  const rows = providers.map((p) => {
    const runs = p.batch?.runs.map((r) => r.ttfbMs).filter((v) => v > 0) || [];
    const spread = runs.length >= 2 ? Math.max(...runs) - Math.min(...runs) : 0;
    const minRun = runs.length > 0 ? Math.min(...runs) : 0;
    const maxRun = runs.length > 0 ? Math.max(...runs) : 0;

    return {
      ...p,
      avgTtfb: p.batch?.avgTtfb || p.stats.p50,
      avgTotalTime: p.batch?.avgTotalTime || p.latest?.totalTimeMs || 0,
      spread,
      minRun,
      maxRun,
      runs,
    };
  });

  const sorted = [...rows].sort((a, b) => {
    let aVal: number, bVal: number;
    switch (sortKey) {
      case "min": aVal = a.stats.min; bVal = b.stats.min; break;
      case "avg": aVal = a.stats.avg; bVal = b.stats.avg; break;
      case "p50": aVal = a.stats.p50; bVal = b.stats.p50; break;
      case "p95": aVal = a.stats.p95; bVal = b.stats.p95; break;
      case "p99": aVal = a.stats.p99; bVal = b.stats.p99; break;
      case "spread": aVal = a.spread; bVal = b.spread; break;
      default: aVal = 0; bVal = 0;
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  const thBase = "px-[18px] py-3 text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] border-b border-border bg-bg cursor-pointer select-none hover:text-text-primary transition-colors whitespace-nowrap";

  function sortIndicator(key: SortKey) {
    return sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";
  }

  function renderCell(value: number, suffix = "ms") {
    if (value === 0) return <span className="text-text-muted">—</span>;
    return (
      <div
        className="rounded-[4px] px-2 py-1 font-mono text-[12px] font-semibold text-center"
        style={{
          background: heatColor(value),
          color: heatTextColor(value),
        }}
      >
        {value >= 1000 && suffix === "ms" ? `${(value / 1000).toFixed(1)}s` : `${value}${suffix}`}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thBase + " text-left"} style={{ width: 170 }}>Provider</th>
            <th className={thBase + " text-center"} onClick={() => handleSort("min")}>
              Min{sortIndicator("min")}
            </th>
            <th className={thBase + " text-center"} onClick={() => handleSort("avg")}>
              Avg{sortIndicator("avg")}
            </th>
            <th className={thBase + " text-center"} onClick={() => handleSort("p50")}>
              P50{sortIndicator("p50")}
            </th>
            <th className={thBase + " text-center"} onClick={() => handleSort("p95")}>
              P95{sortIndicator("p95")}
            </th>
            <th className={thBase + " text-center"} onClick={() => handleSort("p99")}>
              P99{sortIndicator("p99")}
            </th>
            <th className={thBase + " text-center"} onClick={() => handleSort("spread")}>
              Spread{sortIndicator("spread")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.id}
              className="border-b border-border-subtle last:border-b-0 hover:bg-surface-hover transition-colors"
            >
              <td className="px-[18px] py-3 text-[13px] font-semibold">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[6px] bg-bg border border-border flex items-center justify-center text-[12px] font-bold text-text-muted flex-shrink-0">
                    {ABBREVIATIONS[p.id] || p.name.slice(0, 2)}
                  </div>
                  <div>
                    <div>{p.name}</div>
                    {p.runs.length > 0 && (
                      <div className="text-[9px] font-mono text-text-faint font-normal mt-0.5">
                        runs: {p.runs.join(", ")}ms
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-[14px] py-3">{renderCell(p.stats.min)}</td>
              <td className="px-[14px] py-3">{renderCell(p.stats.avg)}</td>
              <td className="px-[14px] py-3">{renderCell(p.stats.p50)}</td>
              <td className="px-[14px] py-3">{renderCell(p.stats.p95)}</td>
              <td className="px-[14px] py-3">{renderCell(p.stats.p99)}</td>
              <td className="px-[14px] py-3">{renderCell(p.spread)}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-[18px] py-8 text-center text-text-muted text-sm">
                No data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
