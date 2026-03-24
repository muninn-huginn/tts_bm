"use client";

import { providers as providerConfig } from "@/config/providers";

const COLORS: Record<string, string> = {
  "cartesia-sonic3": "#111111",
  "cartesia-turbo": "#555555",
  elevenlabs: "#6366f1",
  deepgram: "#00A861",
  fish: "#D97706",
};

interface ProviderFilterProps {
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export function ProviderFilter({ selected, onToggle }: ProviderFilterProps) {
  const enabled = providerConfig.filter((p) => p.enabled);

  return (
    <div className="flex flex-wrap gap-1.5">
      {enabled.map((p) => {
        const active = selected.has(p.id);
        const color = COLORS[p.id] || "var(--text-muted)";

        return (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            className={`
              flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full
              border transition-all cursor-pointer select-none
              ${active
                ? "border-border bg-surface shadow-sm text-text-primary"
                : "border-transparent bg-transparent text-text-faint hover:text-text-muted"
              }
            `}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
              style={{
                background: color,
                opacity: active ? 1 : 0.3,
              }}
            />
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
