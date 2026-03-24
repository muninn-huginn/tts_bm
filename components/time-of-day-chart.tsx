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

interface HistoryPoint {
  timestamp: string;
  ttfbMs: number;
}

interface ProviderHistory {
  providerId: string;
  points: HistoryPoint[];
}

interface TimeOfDayChartProps {
  data: ProviderHistory[];
}

export function TimeOfDayChart({ data }: TimeOfDayChartProps) {
  // Group all data points by hour-of-day (UTC), then compute avg + min/max per provider per hour
  const hourBuckets: Record<
    number,
    Record<string, number[]>
  > = {};

  for (const provider of data) {
    for (const point of provider.points) {
      const hour = new Date(point.timestamp).getUTCHours();
      if (!hourBuckets[hour]) hourBuckets[hour] = {};
      if (!hourBuckets[hour][provider.providerId]) hourBuckets[hour][provider.providerId] = [];
      hourBuckets[hour][provider.providerId].push(point.ttfbMs);
    }
  }

  const hours = Object.keys(hourBuckets)
    .map(Number)
    .sort((a, b) => a - b);

  if (hours.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[10px] shadow-sm p-6 text-center text-text-muted text-sm">
        Not enough data yet — need probes across multiple time slots
      </div>
    );
  }

  const { hidden, toggle } = useChartFilter();
  const allProviderIds = [...new Set(data.filter((d) => d.points.length > 0).map((d) => d.providerId))];
  const activeProviders = allProviderIds.filter((id) => !hidden.has(id));

  // Build chart data: one entry per hour, with avg per provider
  const chartData = hours.map((hour) => {
    const entry: Record<string, unknown> = {
      hour,
      label: `${hour.toString().padStart(2, "0")}:00`,
    };

    for (const pid of activeProviders) {
      const values = hourBuckets[hour]?.[pid] || [];
      if (values.length > 0) {
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        const min = Math.min(...values);
        const max = Math.max(...values);
        entry[pid] = avg;
        entry[`${pid}_min`] = avg - min;
        entry[`${pid}_max`] = max - avg;
        entry[`${pid}_range`] = [avg - min, max - avg];
        entry[`${pid}_count`] = values.length;
        entry[`${pid}_values`] = values;
      }
    }

    return entry;
  });

  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-[22px] pt-[18px] pb-[14px]">
        <span className="text-[13px] font-semibold text-text-primary">
          TTFB by Time of Day
        </span>
        <span className="text-[11px] text-text-muted ml-2">
          Average TTFB at each probe hour (UTC) · error bars show min–max range
        </span>
      </div>

      <div className="px-[22px] pb-[18px] h-[280px]">
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
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      padding: "12px",
                      lineHeight: "1.8",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: 4,
                        fontFamily: "var(--font-sans)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {label} UTC
                    </div>
                    {payload.map((entry) => {
                      const pid = entry.dataKey as string;
                      const values = (entry.payload as Record<string, unknown>)[`${pid}_values`] as
                        | number[]
                        | undefined;
                      const count = (entry.payload as Record<string, unknown>)[`${pid}_count`] as
                        | number
                        | undefined;
                      return (
                        <div key={pid} style={{ color: entry.color }}>
                          <span style={{ fontFamily: "var(--font-sans)" }}>
                            {nameMap.get(pid) || pid}:
                          </span>{" "}
                          <strong>{entry.value}ms</strong>
                          {values && values.length > 1 && (
                            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                              {" "}
                              ({Math.min(...values)}–{Math.max(...values)}ms, n={count})
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
                maxBarSize={32}
              >
                <ErrorBar
                  dataKey={`${pid}_range`}
                  width={6}
                  strokeWidth={1.5}
                  stroke={COLORS[pid] || "var(--text-muted)"}
                  opacity={0.6}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="px-[22px] pb-[18px]">
        <ChartLegend providerIds={allProviderIds} hidden={hidden} onToggle={toggle} />
      </div>
    </div>
  );
}
