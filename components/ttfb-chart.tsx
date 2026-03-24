"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TimeRangePicker } from "./time-range-picker";
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

interface HistoryPoint {
  timestamp: string;
  ttfbMs: number;
  totalTimeMs: number;
}

interface ProviderHistory {
  providerId: string;
  points: HistoryPoint[];
}

interface TTFBChartProps {
  data: ProviderHistory[];
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  onCustomRange: (start: string, end: string) => void;
}

export function TTFBChart({
  data,
  timeRange,
  onTimeRangeChange,
  onCustomRange,
}: TTFBChartProps) {
  const { hidden, toggle } = useChartFilter();
  const allActive = data.filter((d) => d.points.length > 0);
  const activeProviders = allActive.filter((d) => !hidden.has(d.providerId));

  const emptyState = (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-[22px] pt-[18px] pb-[14px] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-primary">TTFB Over Time</span>
        <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} onCustomRange={onCustomRange} />
      </div>
      <div className="px-[22px] pb-[18px] h-[320px] flex items-center justify-center text-text-muted text-sm">
        No data for this time range
      </div>
      {allActive.length > 0 && (
        <div className="px-[22px] pb-[18px]">
          <ChartLegend providerIds={allActive.map((p) => p.providerId)} hidden={hidden} onToggle={toggle} />
        </div>
      )}
    </div>
  );

  if (activeProviders.length === 0) return emptyState;

  // Group all points into probe sessions (within 5 min window)
  const allPoints: { providerId: string; ts: number; ttfbMs: number }[] = [];
  for (const p of activeProviders) {
    for (const pt of p.points) {
      allPoints.push({ providerId: p.providerId, ts: new Date(pt.timestamp).getTime(), ttfbMs: pt.ttfbMs });
    }
  }
  allPoints.sort((a, b) => a.ts - b.ts);

  type Session = { ts: number; providers: Record<string, number[]> };
  const sessions: Session[] = [];
  for (const pt of allPoints) {
    const last = sessions[sessions.length - 1];
    if (last && Math.abs(pt.ts - last.ts) < 5 * 60 * 1000) {
      if (!last.providers[pt.providerId]) last.providers[pt.providerId] = [];
      last.providers[pt.providerId].push(pt.ttfbMs);
    } else {
      sessions.push({ ts: pt.ts, providers: { [pt.providerId]: [pt.ttfbMs] } });
    }
  }

  if (sessions.length === 0) return emptyState;

  const activePids = activeProviders.map((p) => p.providerId);

  // Build unified timeline: each session = one data point with avg per provider
  const chartData = sessions.map((session) => {
    const d = new Date(session.ts);
    const entry: Record<string, unknown> = {
      ts: session.ts,
      label: `${(d.getMonth() + 1)}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
    };

    for (const pid of activePids) {
      const runs = session.providers[pid];
      if (runs && runs.length > 0) {
        const avg = Math.round(runs.reduce((a, b) => a + b, 0) / runs.length);
        entry[pid] = avg;
        entry[`${pid}_runs`] = runs;
      }
    }

    return entry;
  });

  // Compute nice Y ticks using log-ish scale
  const allY = chartData.flatMap((d) =>
    activePids.map((pid) => (d[pid] as number) || 0).filter(Boolean)
  );
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);

  // Generate log-friendly ticks
  const logTicks: number[] = [];
  const powers = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
  for (const p of powers) {
    if (p >= yMin * 0.5 && p <= yMax * 1.5) logTicks.push(p);
  }
  if (logTicks.length < 2) {
    // Fallback to linear
    const step = Math.ceil((yMax - yMin) / 4 / 50) * 50 || 50;
    for (let v = Math.floor(yMin / step) * step; v <= yMax * 1.1; v += step) {
      logTicks.push(v);
    }
  }

  const yDomainMin = Math.max(0, (logTicks[0] || yMin) * 0.8);
  const yDomainMax = (logTicks[logTicks.length - 1] || yMax) * 1.15;

  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-[22px] pt-[18px] pb-[14px] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-primary">
          TTFB Over Time
        </span>
        <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} onCustomRange={onCustomRange} />
      </div>

      <div className="px-[22px] pb-[14px] h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ts) => {
                const d = new Date(ts);
                return `${(d.getMonth() + 1)}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:00`;
              }}
              stroke="var(--text-faint)"
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              scale="time"
            />
            <YAxis
              domain={[yDomainMin, yDomainMax]}
              ticks={logTicks}
              stroke="var(--text-faint)"
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`}
              axisLine={false}
              tickLine={false}
              width={50}
              scale="log"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const dataPoint = payload[0]?.payload as Record<string, unknown>;
                const lbl = dataPoint?.label as string;
                return (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      padding: "10px 14px",
                      lineHeight: "1.8",
                      minWidth: 160,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-sans)", marginBottom: 2 }}>
                      {lbl}
                    </div>
                    {payload.map((entry) => {
                      if (!entry.value) return null;
                      const pid = entry.dataKey as string;
                      const runs = dataPoint[`${pid}_runs`] as number[] | undefined;
                      return (
                        <div key={pid} style={{ fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: entry.color, fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                            {nameMap.get(pid) || pid}
                          </span>
                          {" "}
                          <strong style={{ color: "var(--text-primary)" }}>{entry.value}ms</strong>
                          {runs && runs.length > 1 && (
                            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                              {" "}({runs.join(", ")})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            {activePids.map((pid) => {
              const color = COLORS[pid] || "var(--text-muted)";
              return (
                <Line
                  key={pid}
                  dataKey={pid}
                  name={nameMap.get(pid) || pid}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: color, stroke: "var(--surface)", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: color, stroke: "var(--surface)", strokeWidth: 2 }}
                  connectNulls
                  type="monotone"
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="px-[22px] pb-[18px]">
        <ChartLegend
          providerIds={allActive.map((p) => p.providerId)}
          hidden={hidden}
          onToggle={toggle}
        />
      </div>
    </div>
  );
}
