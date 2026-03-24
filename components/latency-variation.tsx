"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
  Cell,
} from "recharts";
import { ChartLegend, useChartFilter } from "./chart-legend";
import { providers as providerConfig } from "@/config/providers";

const COLORS: Record<string, string> = {
  "cartesia-sonic3": "#111111",
  "cartesia-turbo": "#555555",
  elevenlabs: "#6366f1",
  deepgram: "#00A861",
  fish: "#D97706",
};

const nameMap = new Map(providerConfig.map((p) => [p.id, p.name]));

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

export function LatencyVariation({ providers }: { providers: Provider[] }) {
  const { hidden, toggle } = useChartFilter();
  const allWithRuns = providers.filter((p) => p.batch && p.batch.runs.length > 0);
  const withRuns = allWithRuns.filter((p) => !hidden.has(p.id));

  if (allWithRuns.length === 0) return null;

  // Build chart data: one bar per provider showing avg, with error bars for min-max
  const chartData = withRuns.map((p) => {
    const runs = p.batch!.runs.map((r) => r.ttfbMs).sort((a, b) => a - b);
    const avg = p.batch!.avgTtfb;
    const min = Math.min(...runs);
    const max = Math.max(...runs);

    return {
      name: nameMap.get(p.id) || p.id,
      id: p.id,
      avg,
      errorBar: [avg - min, max - avg] as [number, number],
      runs,
      min,
      max,
    };
  });

  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-[22px] pt-[18px] pb-[14px]">
        <span className="text-[13px] font-semibold text-text-primary">
          Latency Variation
        </span>
        <span className="text-[11px] text-text-muted ml-2">
          Avg TTFB with min–max range
        </span>
      </div>

      <div className="px-[22px] pb-[18px] h-[260px]">
        {withRuns.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            All providers hidden
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="var(--text-faint)"
                tick={{ fontSize: 10, fontFamily: "var(--font-sans)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-faint)"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickFormatter={(v) => `${v}ms`}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as (typeof chartData)[0] | undefined;
                  if (!d) return null;
                  return (
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        padding: "10px 12px",
                        lineHeight: "1.8",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontFamily: "var(--font-sans)", color: "var(--text-primary)" }}>
                        {d.name}
                      </div>
                      <div>
                        Avg: <strong>{d.avg}ms</strong>
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        Runs: {d.runs.join(", ")}ms
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        Range: {d.min}–{d.max}ms (±{Math.round((d.max - d.min) / 2)}ms)
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={COLORS[entry.id] || "var(--text-muted)"}
                    opacity={0.75}
                  />
                ))}
                <ErrorBar
                  dataKey="errorBar"
                  width={10}
                  strokeWidth={2}
                  stroke="var(--text-secondary)"
                  opacity={0.5}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="px-[22px] pb-[18px]">
        <ChartLegend providerIds={allWithRuns.map((p) => p.id)} hidden={hidden} onToggle={toggle} />
      </div>
    </div>
  );
}
