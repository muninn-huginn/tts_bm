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
  stats: { p50: number; p95: number; p99: number; uptime24h: number };
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
};

type SortKey = "avgTtfb" | "p50" | "p95" | "p99" | "spread";

/**
 * Map a value to a heatmap color.
 * Lower = green, medium = yellow, high = red.
 */
function heatColor(value: number, min: number, max: number): string {
  if (value === 0 || max === min) return "var(--surface)";
  const ratio = Math.min((value - min) / (max - min), 1);

  // Green (good) → Yellow (fair) → Red (bad)
  if (ratio < 0.5) {
    const t = ratio * 2;
    const r = Math.round(0 + t * 217);
    const g = Math.round(168 + t * (119 - 168));
    const b = Math.round(97 + t * (6 - 97));
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  } else {
    const t = (ratio - 0.5) * 2;
    const r = Math.round(217 + t * (220 - 217));
    const g = Math.round(119 + t * (38 - 119));
    const b = Math.round(6 + t * (38 - 6));
    return `rgba(${r}, ${g}, ${b}, 0.18)`;
  }
}

function heatTextColor(value: number, min: number, max: number): string {
  if (value === 0 || max === min) return "var(--text-muted)";
  const ratio = Math.min((value - min) / (max - min), 1);
  if (ratio < 0.35) return "#056b3a";
  if (ratio < 0.65) return "#92400e";
  return "#991b1b";
}

export function ComparisonTable({ providers }: { providers: Provider[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("avgTtfb");
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
      case "avgTtfb": aVal = a.avgTtfb; bVal = b.avgTtfb; break;
      case "p50": aVal = a.stats.p50; bVal = b.stats.p50; break;
      case "p95": aVal = a.stats.p95; bVal = b.stats.p95; break;
      case "p99": aVal = a.stats.p99; bVal = b.stats.p99; break;
      case "spread": aVal = a.spread; bVal = b.spread; break;
      default: aVal = 0; bVal = 0;
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  // Compute column ranges for heatmap
  const ranges = {
    avgTtfb: { min: Math.min(...rows.map((r) => r.avgTtfb).filter(Boolean)), max: Math.max(...rows.map((r) => r.avgTtfb)) },
    p50: { min: Math.min(...rows.map((r) => r.stats.p50).filter(Boolean)), max: Math.max(...rows.map((r) => r.stats.p50)) },
    p95: { min: Math.min(...rows.map((r) => r.stats.p95).filter(Boolean)), max: Math.max(...rows.map((r) => r.stats.p95)) },
    p99: { min: Math.min(...rows.map((r) => r.stats.p99).filter(Boolean)), max: Math.max(...rows.map((r) => r.stats.p99)) },
    spread: { min: Math.min(...rows.map((r) => r.spread)), max: Math.max(...rows.map((r) => r.spread)) },
  };

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  const thBase = "px-[18px] py-3 text-[11px] font-semibold text-text-muted uppercase tracking-[0.06em] border-b border-border bg-bg cursor-pointer select-none hover:text-text-primary transition-colors whitespace-nowrap";

  function sortIndicator(key: SortKey) {
    return sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";
  }

  function renderCell(value: number, range: { min: number; max: number }, suffix = "ms") {
    if (value === 0) return <span className="text-text-muted">—</span>;
    return (
      <div
        className="rounded-[4px] px-2 py-1 font-mono text-[12px] font-semibold text-center"
        style={{
          background: heatColor(value, range.min, range.max),
          color: heatTextColor(value, range.min, range.max),
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
            <th className={thBase + " text-center"} onClick={() => handleSort("avgTtfb")}>
              Avg TTFB{sortIndicator("avgTtfb")}
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
              <td className="px-[14px] py-3">{renderCell(p.avgTtfb, ranges.avgTtfb)}</td>
              <td className="px-[14px] py-3">{renderCell(p.stats.p50, ranges.p50)}</td>
              <td className="px-[14px] py-3">{renderCell(p.stats.p95, ranges.p95)}</td>
              <td className="px-[14px] py-3">{renderCell(p.stats.p99, ranges.p99)}</td>
              <td className="px-[14px] py-3">{renderCell(p.spread, ranges.spread)}</td>
            </tr>
          ))}
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
