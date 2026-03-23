"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TimeRangePicker } from "./time-range-picker";
import { providers as providerConfig } from "@/config/providers";

const COLORS = [
  "#111111",
  "#00A861",
  "#6366f1",
  "#D97706",
  "#DC2626",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

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
  // Merge all provider data into a unified timeline
  const timeMap = new Map<
    string,
    Record<string, number>
  >();

  for (const provider of data) {
    for (const point of provider.points) {
      const key = point.timestamp;
      if (!timeMap.has(key)) {
        timeMap.set(key, { timestamp: new Date(key).getTime() });
      }
      timeMap.get(key)![provider.providerId] = point.ttfbMs;
    }
  }

  const chartData = Array.from(timeMap.values()).sort(
    (a, b) => (a.timestamp as number) - (b.timestamp as number)
  );

  const nameMap = new Map(
    providerConfig.map((p) => [p.id, p.name])
  );

  const activeProviders = data
    .filter((d) => d.points.length > 0)
    .map((d) => d.providerId);

  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
      <div className="px-[22px] pt-[18px] pb-[14px] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-primary">
          TTFB Over Time
        </span>
        <TimeRangePicker
          value={timeRange}
          onChange={onTimeRangeChange}
          onCustomRange={onCustomRange}
        />
      </div>

      <div className="px-[22px] pb-[18px] h-[260px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            No data for this time range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts) => {
                  const d = new Date(ts);
                  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                }}
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
                width={50}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
                labelFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                formatter={(value: number, name: string) => [
                  `${value}ms`,
                  nameMap.get(name) || name,
                ]}
              />
              {activeProviders.map((id, i) => (
                <Line
                  key={id}
                  dataKey={id}
                  name={id}
                  type="monotone"
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={i === 0 ? 2 : 1.5}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="px-[22px] pb-[18px] flex flex-wrap gap-3.5">
        {activeProviders.map((id, i) => (
          <div key={id} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
            <div
              className="w-2 h-2 rounded-[2px]"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            {nameMap.get(id) || id}
          </div>
        ))}
        {data.length > activeProviders.length && (
          <span className="text-[11px] text-text-muted">
            + {data.length - activeProviders.length} more
          </span>
        )}
      </div>
    </div>
  );
}
