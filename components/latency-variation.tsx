"use client";

import { ChartLegend, useChartFilter } from "./chart-legend";
import { providers as providerConfig } from "@/config/providers";

interface BatchRun {
  runIndex: number;
  ttfbMs: number;
  totalTimeMs: number;
}

interface Provider {
  id: string;
  name: string;
  status: string;
  stats: { p50: number; p95: number; p99: number };
  batch?: { runs: BatchRun[]; avgTtfb: number } | null;
}

const COLORS: Record<string, string> = {
  "cartesia-sonic3": "#111111",
  "cartesia-turbo": "#555555",
  elevenlabs: "#6366f1",
  deepgram: "#00A861",
  fish: "#D97706",
};

export function LatencyVariation({ providers }: { providers: Provider[] }) {
  const { hidden, toggle } = useChartFilter();
  const allWithRuns = providers.filter((p) => p.batch && p.batch.runs.length > 0);
  const withRuns = allWithRuns.filter((p) => !hidden.has(p.id));

  if (allWithRuns.length === 0) return null;

  // Find global max for scaling
  const allTtfbs = withRuns.flatMap((p) => p.batch!.runs.map((r) => r.ttfbMs));
  const maxTtfb = Math.max(...allTtfbs, 100);

  // Chart height and padding
  const chartH = 240;
  const padTop = 20;
  const padBottom = 60;
  const padLeft = 55;
  const padRight = 20;
  const plotH = chartH - padTop - padBottom;

  const colWidth = Math.min(120, (800 - padLeft - padRight) / withRuns.length);

  const svgW = padLeft + padRight + withRuns.length * colWidth;

  function yScale(val: number) {
    return padTop + plotH - (val / maxTtfb) * plotH;
  }

  // Grid lines
  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const val = Math.round((maxTtfb / gridSteps) * i);
    return { val, y: yScale(val) };
  });

  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-[22px] pt-[18px] pb-[14px]">
        <span className="text-[13px] font-semibold text-text-primary">
          Latency Variation
        </span>
        <span className="text-[11px] text-text-muted ml-2">
          Distribution of TTFB across runs · dot = individual run, line = range
        </span>
      </div>

      <div className="px-[22px] pb-[22px] overflow-x-auto">
        <svg width={svgW} height={chartH} className="block mx-auto">
          {/* Grid lines */}
          {gridLines.map(({ val, y }) => (
            <g key={val}>
              <line
                x1={padLeft}
                x2={svgW - padRight}
                y1={y}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth={1}
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                fill="var(--text-faint)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                {val}ms
              </text>
            </g>
          ))}

          {/* Per-provider columns */}
          {withRuns.map((p, i) => {
            const cx = padLeft + i * colWidth + colWidth / 2;
            const runs = p.batch!.runs.map((r) => r.ttfbMs).sort((a, b) => a - b);
            const avg = p.batch!.avgTtfb;
            const min = runs[0];
            const max = runs[runs.length - 1];
            const color = COLORS[p.id] || "var(--text-muted)";

            return (
              <g key={p.id}>
                {/* Range line (min to max) */}
                <line
                  x1={cx}
                  x2={cx}
                  y1={yScale(max)}
                  y2={yScale(min)}
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.3}
                />

                {/* Range caps */}
                <line x1={cx - 8} x2={cx + 8} y1={yScale(max)} y2={yScale(max)} stroke={color} strokeWidth={2} opacity={0.4} />
                <line x1={cx - 8} x2={cx + 8} y1={yScale(min)} y2={yScale(min)} stroke={color} strokeWidth={2} opacity={0.4} />

                {/* Average line */}
                <line
                  x1={cx - 12}
                  x2={cx + 12}
                  y1={yScale(avg)}
                  y2={yScale(avg)}
                  stroke={color}
                  strokeWidth={2.5}
                />

                {/* Individual run dots */}
                {runs.map((val, j) => (
                  <circle
                    key={j}
                    cx={cx + (j - 1) * 8}
                    cy={yScale(val)}
                    r={4.5}
                    fill={color}
                    opacity={0.7}
                    stroke="var(--surface)"
                    strokeWidth={1.5}
                  />
                ))}

                {/* Average value label */}
                <text
                  x={cx}
                  y={yScale(avg) - 12}
                  textAnchor="middle"
                  fill={color}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  fontWeight={600}
                >
                  {avg}ms
                </text>

                {/* Provider name */}
                <text
                  x={cx}
                  y={chartH - padBottom + 18}
                  textAnchor="middle"
                  fill="var(--text-secondary)"
                  fontSize={10}
                  fontFamily="var(--font-sans)"
                  fontWeight={500}
                >
                  {p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name}
                </text>
                <text
                  x={cx}
                  y={chartH - padBottom + 32}
                  textAnchor="middle"
                  fill="var(--text-faint)"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                >
                  {min}–{max}ms
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="px-[22px] pb-[18px]">
        <ChartLegend providerIds={allWithRuns.map((p) => p.id)} hidden={hidden} onToggle={toggle} />
      </div>
    </div>
  );
}
