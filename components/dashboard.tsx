"use client";

import useSWR from "swr";
import { Nav } from "./nav";
import { HeroStats } from "./hero-stats";
import { RankingStrip } from "./ranking-strip";
import { TTFBChart } from "./ttfb-chart";
import { ProviderSidebar } from "./provider-sidebar";
import { LatencyVariation } from "./latency-variation";
import { TimeOfDayChart } from "./time-of-day-chart";
import { ComparisonTable } from "./comparison-table";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Dashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [customRange, setCustomRange] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const { data: resultsData } = useSWR("/api/results", fetcher, {
    refreshInterval: 60_000,
  });

  const historyUrl = customRange
    ? `/api/results/history?provider=all&start=${customRange.start}&end=${customRange.end}`
    : `/api/results/history?provider=all&range=${timeRange}`;

  const { data: historyData } = useSWR(historyUrl, fetcher, {
    refreshInterval: 60_000,
  });

  const providers = resultsData?.providers || [];
  const updatedAt = resultsData?.updatedAt;

  // Sort by average TTFB from batch, falling back to p50
  const ranked = [...providers].sort(
    (a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aVal = (a.batch as { avgTtfb: number })?.avgTtfb || (a.stats as { p50: number })?.p50 || Infinity;
      const bVal = (b.batch as { avgTtfb: number })?.avgTtfb || (b.stats as { p50: number })?.p50 || Infinity;
      return aVal - bVal;
    }
  );

  return (
    <>
      <Nav lastUpdated={updatedAt} />

      <div className="max-w-[1200px] mx-auto px-8 pt-12 animate-in">
        <h1 className="text-[32px] font-bold tracking-[-0.8px] text-text-primary">
          Real-time TTS Latency
        </h1>
        <p className="text-[15px] text-text-secondary mt-1.5 max-w-[480px] leading-relaxed">
          Continuous benchmarks measuring time-to-first-byte across leading
          text-to-speech providers.
        </p>
      </div>

      <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-8">
        {/* Hero Stats */}
        <div className="animate-in" style={{ animationDelay: "0.03s" }}>
          <HeroStats providers={ranked} />
        </div>

        {/* Ranking Strip */}
        <div className="animate-in" style={{ animationDelay: "0.06s" }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3.5">
            Ranked by avg TTFB · 3 runs per probe
          </div>
          <RankingStrip providers={ranked} />
        </div>

        {/* Chart + Sidebar */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 animate-in"
          style={{ animationDelay: "0.09s" }}
        >
          <TTFBChart
            data={historyData || []}
            timeRange={timeRange}
            onTimeRangeChange={(range) => {
              setCustomRange(null);
              setTimeRange(range);
            }}
            onCustomRange={(start, end) => {
              setCustomRange({ start, end });
              setTimeRange("custom");
            }}
          />
          <ProviderSidebar providers={ranked} />
        </div>

        {/* Latency Variation */}
        <div className="animate-in" style={{ animationDelay: "0.12s" }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3.5">
            Latency Variation
          </div>
          <LatencyVariation providers={ranked} />
        </div>

        {/* Time of Day */}
        <div className="animate-in" style={{ animationDelay: "0.14s" }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3.5">
            TTFB by Time of Day
          </div>
          <TimeOfDayChart data={historyData || []} />
        </div>

        {/* Heatmap Table */}
        <div className="animate-in" style={{ animationDelay: "0.15s" }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3.5">
            Performance Heatmap
          </div>
          <ComparisonTable providers={ranked} />
        </div>
      </div>

      {/* Footer */}
      <footer
        className="max-w-[1200px] mx-auto px-8 py-8 mt-8 border-t border-border flex justify-between items-center animate-in"
        style={{ animationDelay: "0.18s" }}
      >
        <span className="text-xs text-text-muted">
          TTS Benchmark · 3 runs per provider · 5 probes daily
        </span>
        <a
          href="https://github.com/muninn-huginn/tts_bm"
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          GitHub
        </a>
      </footer>
    </>
  );
}
