"use client";

import { useState } from "react";

const PRESETS = ["1h", "6h", "24h", "7d", "30d"];

interface TimeRangePickerProps {
  value: string;
  onChange: (range: string) => void;
  onCustomRange: (start: string, end: string) => void;
}

export function TimeRangePicker({
  value,
  onChange,
  onCustomRange,
}: TimeRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  return (
    <div className="flex items-center gap-0.5 bg-bg p-0.5 rounded-[6px]">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          onClick={() => {
            setShowCustom(false);
            onChange(preset);
          }}
          className={`text-[11px] font-medium px-3 py-[5px] rounded transition-all font-sans ${
            value === preset && !showCustom
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {preset}
        </button>
      ))}
      <div className="relative">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`text-[11px] font-medium px-3 py-[5px] rounded border border-dashed transition-all font-sans ${
            showCustom || value === "custom"
              ? "border-border bg-surface text-text-primary shadow-sm"
              : "border-border text-text-muted hover:text-text-secondary"
          }`}
        >
          Custom
        </button>
        {showCustom && (
          <div className="absolute right-0 top-full mt-2 bg-surface border border-border rounded-lg shadow-md p-3 z-10 flex gap-2 items-end">
            <div>
              <label className="text-[10px] text-text-muted block mb-1">
                Start
              </label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs border border-border rounded px-2 py-1 bg-bg font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted block mb-1">
                End
              </label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs border border-border rounded px-2 py-1 bg-bg font-mono"
              />
            </div>
            <button
              onClick={() => {
                if (customStart && customEnd) {
                  onCustomRange(
                    new Date(customStart).toISOString(),
                    new Date(customEnd).toISOString()
                  );
                  setShowCustom(false);
                }
              }}
              className="text-xs bg-text-primary text-bg px-3 py-1 rounded font-medium"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
