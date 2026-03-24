"use client";

import { useState } from "react";
import { providers as providerConfig } from "@/config/providers";

const COLORS: Record<string, string> = {
  "cartesia-sonic3": "#111111",
  "cartesia-turbo": "#555555",
  elevenlabs: "#6366f1",
  deepgram: "#00A861",
  fish: "#D97706",
};

const nameMap = new Map(providerConfig.map((p) => [p.id, p.name]));

interface ChartLegendProps {
  providerIds: string[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
}

export function ChartLegend({ providerIds, hidden, onToggle }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {providerIds.map((id) => {
        const isHidden = hidden.has(id);
        const color = COLORS[id] || "var(--text-muted)";

        return (
          <button
            key={id}
            onClick={() => onToggle(id)}
            className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full transition-all cursor-pointer select-none hover:bg-surface-hover"
            style={{ opacity: isHidden ? 0.3 : 1 }}
          >
            <div
              className="w-2 h-2 rounded-[2px] flex-shrink-0 transition-opacity"
              style={{ background: color }}
            />
            <span className={isHidden ? "text-text-faint line-through" : "text-text-secondary"}>
              {nameMap.get(id) || id}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Hook to manage per-chart hidden providers */
export function useChartFilter() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { hidden, toggle };
}
