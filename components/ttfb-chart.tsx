"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Line,
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

  if (activeProviders.length === 0) {
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

  // Group points into probe sessions (cluster within 5 min) and compute avg per provider per session
  const allPoints: { providerId: string; ts: number; ttfbMs: number }[] = [];
  for (const p of activeProviders) {
    for (const pt of p.points) {
      allPoints.push({ providerId: p.providerId, ts: new Date(pt.timestamp).getTime(), ttfbMs: pt.ttfbMs });
    }
  }
  allPoints.sort((a, b) => a.ts - b.ts);

  // Cluster into sessions
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

  // Build per-provider scatter data (one dot per session = avg of runs)
  const providerData: Record<string, { x: number; y: number; runs: number[]; label: string }[]> = {};
  for (const session of sessions) {
    const d = new Date(session.ts);
    const label = `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

    for (const pid of activeProviders.map((p) => p.providerId)) {
      const runs = session.providers[pid];
      if (runs && runs.length > 0) {
        const avg = Math.round(runs.reduce((a, b) => a + b, 0) / runs.length);
        if (!providerData[pid]) providerData[pid] = [];
        providerData[pid].push({ x: session.ts, y: avg, runs, label });
      }
    }
  }

  // Compute domain
  const allY = Object.values(providerData).flat().map((d) => d.y);
  const allX = Object.values(providerData).flat().map((d) => d.x);
  const yMax = Math.max(...allY) * 1.15;
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);

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
          <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="0" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[xMin, xMax]}
              tickFormatter={(ts) => {
                const d = new Date(ts);
                return `${(d.getMonth() + 1)}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
              }}
              stroke="var(--text-faint)"
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={[0, yMax]}
              stroke="var(--text-faint)"
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `${v}ms`}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <ZAxis range={[40, 40]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as { y: number; runs: number[]; label: string } | undefined;
                if (!d) return null;
                const pid = (payload[0] as unknown as { name: string })?.name;
                return (
                  <div
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      padding: "10px 12px",
                      lineHeight: "1.7",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
                      {d.label}
                    </div>
                    <div style={{ color: COLORS[pid] || "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {nameMap.get(pid) || pid}: <strong>{d.y}ms</strong>
                      {d.runs.length > 1 && (
                        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                          {" "}({d.runs.join(", ")})
                        </span>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            {activeProviders.map((p) => {
              const points = providerData[p.providerId] || [];
              const color = COLORS[p.providerId] || "var(--text-muted)";

              return (
                <Scatter
                  key={p.providerId}
                  name={p.providerId}
                  data={points}
                  fill={color}
                  line={{ stroke: color, strokeWidth: 1.5, strokeOpacity: 0.4 }}
                  lineType="joint"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  shape={((props: any) => (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={color}
                      stroke="var(--surface)"
                      strokeWidth={1.5}
                    />
                  )) as any}
                />
              );
            })}
          </ScatterChart>
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
