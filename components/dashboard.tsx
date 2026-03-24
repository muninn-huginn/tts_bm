"use client";

import useSWR from "swr";
import { Nav } from "./nav";
import { HeroStats } from "./hero-stats";
import { ProviderFilter } from "./provider-filter";
import { RankingStrip } from "./ranking-strip";
import { TTFBChart } from "./ttfb-chart";
import { ProviderSidebar } from "./provider-sidebar";
import { LatencyVariation } from "./latency-variation";
import { TimeOfDayChart } from "./time-of-day-chart";
import { ComparisonTable } from "./comparison-table";
import { useState, useMemo } from "react";
import { providers as providerConfig } from "@/config/providers";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Dashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [customRange, setCustomRange] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // Provider filter — all selected by default
  const allIds = useMemo(() => new Set(providerConfig.filter((p) => p.enabled).map((p) => p.id)), []);
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(allIds);

  function toggleProvider(id: string) {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Don't allow deselecting all
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

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

  // Filtered views
  const filteredRanked = ranked.filter((p: { id: string }) => selectedProviders.has(p.id));
  const filteredHistory = (historyData || []).filter(
    (p: { providerId: string }) => selectedProviders.has(p.providerId)
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
        {/* Provider Filter */}
        <div className="animate-in flex items-center gap-3" style={{ animationDelay: "0.02s" }}>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] flex-shrink-0">
            Providers
          </span>
          <ProviderFilter selected={selectedProviders} onToggle={toggleProvider} />
        </div>

        {/* Hero Stats */}
        <div className="animate-in" style={{ animationDelay: "0.04s" }}>
          <HeroStats providers={filteredRanked} />
        </div>

        {/* Ranking Strip */}
        <div className="animate-in" style={{ animationDelay: "0.06s" }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3.5">
            Ranked by avg TTFB · 3 runs per probe
          </div>
          <RankingStrip providers={filteredRanked} />
        </div>

        {/* Chart + Sidebar */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 animate-in"
          style={{ animationDelay: "0.08s" }}
        >
          <TTFBChart
            data={filteredHistory}
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
          <ProviderSidebar providers={filteredRanked} />
        </div>

        {/* Latency Variation */}
        <div className="animate-in" style={{ animationDelay: "0.10s" }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3.5">
            Latency Variation
          </div>
          <LatencyVariation providers={filteredRanked} />
        </div>

        {/* Time of Day */}
        <div className="animate-in" style={{ animationDelay: "0.12s" }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3.5">
            TTFB by Time of Day
          </div>
          <TimeOfDayChart data={filteredHistory} />
        </div>

        {/* Heatmap Table */}
        <div className="animate-in" style={{ animationDelay: "0.14s" }}>
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-3.5">
            Performance Heatmap
          </div>
          <ComparisonTable providers={filteredRanked} />
        </div>
      </div>

      {/* Footer */}
      <footer
        className="max-w-[1200px] mx-auto px-8 py-8 mt-8 border-t border-border flex justify-between items-center animate-in"
        style={{ animationDelay: "0.16s" }}
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
