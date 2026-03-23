"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { TimeRangePicker } from "./time-range-picker";
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
  // Group data into probe sessions (batches).
  // Each session = all probes within a ~2min window across providers.
  // Then for each session, show a grouped bar per provider.

  // Collect all data points with timestamps
  const allPoints: { providerId: string; timestamp: number; ttfbMs: number }[] = [];
  for (const provider of data) {
    for (const point of provider.points) {
      allPoints.push({
        providerId: provider.providerId,
        timestamp: new Date(point.timestamp).getTime(),
        ttfbMs: point.ttfbMs,
      });
    }
  }

  if (allPoints.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
        <div className="px-[22px] pt-[18px] pb-[14px] flex items-center justify-between">
          <span className="text-[13px] font-semibold text-text-primary">TTFB Over Time</span>
          <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} onCustomRange={onCustomRange} />
        </div>
        <div className="px-[22px] pb-[18px] h-[300px] flex items-center justify-center text-text-muted text-sm">
          No data for this time range
        </div>
      </div>
    );
  }

  // Group into sessions by clustering timestamps within 5-minute windows
  allPoints.sort((a, b) => a.timestamp - b.timestamp);
  const sessions: { timestamp: number; label: string; providers: Record<string, number[]> }[] = [];

  for (const point of allPoints) {
    const lastSession = sessions[sessions.length - 1];
    if (lastSession && Math.abs(point.timestamp - lastSession.timestamp) < 5 * 60 * 1000) {
      if (!lastSession.providers[point.providerId]) lastSession.providers[point.providerId] = [];
      lastSession.providers[point.providerId].push(point.ttfbMs);
    } else {
      const d = new Date(point.timestamp);
      const label = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      sessions.push({
        timestamp: point.timestamp,
        label,
        providers: { [point.providerId]: [point.ttfbMs] },
      });
    }
  }

  // Build chart data: each session becomes a bar group with avg per provider
  const activeProviders = [...new Set(data.filter((d) => d.points.length > 0).map((d) => d.providerId))];

  const chartData = sessions.map((session) => {
    const entry: Record<string, unknown> = { label: session.label, timestamp: session.timestamp };
    for (const pid of activeProviders) {
      const runs = session.providers[pid] || [];
      entry[pid] = runs.length > 0 ? Math.round(runs.reduce((a, b) => a + b, 0) / runs.length) : null;
      // Also store individual runs for tooltip
      entry[`${pid}_runs`] = runs;
    }
    return entry;
  });

  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-[22px] pt-[18px] pb-[14px] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-primary">
          TTFB Over Time
        </span>
        <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} onCustomRange={onCustomRange} />
      </div>

      <div className="px-[22px] pb-[18px] h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--text-faint)"
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
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
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                padding: "12px",
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    padding: "12px",
                    lineHeight: "1.8",
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: "var(--font-sans)", color: "var(--text-primary)" }}>{label}</div>
                    {payload.map((entry) => {
                      const pid = entry.dataKey as string;
                      const runs = (entry.payload as Record<string, unknown>)[`${pid}_runs`] as number[] | undefined;
                      return (
                        <div key={pid} style={{ color: entry.color }}>
                          <span style={{ fontFamily: "var(--font-sans)" }}>{nameMap.get(pid) || pid}:</span>{" "}
                          <strong>{entry.value}ms</strong>
                          {runs && runs.length > 1 && (
                            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                              {" "}({runs.map((r) => `${r}`).join(", ")})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            {activeProviders.map((pid) => (
              <Bar
                key={pid}
                dataKey={pid}
                name={nameMap.get(pid) || pid}
                fill={COLORS[pid] || "var(--text-muted)"}
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="px-[22px] pb-[18px] flex flex-wrap gap-3.5">
        {activeProviders.map((id) => (
          <div key={id} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <div className="w-2 h-2 rounded-[2px]" style={{ background: COLORS[id] || "var(--text-muted)" }} />
            {nameMap.get(id) || id}
          </div>
        ))}
      </div>
    </div>
  );
}
