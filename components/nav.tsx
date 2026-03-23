"use client";

import { useEffect, useState } from "react";

export function Nav({ lastUpdated }: { lastUpdated?: string }) {
  const [ago, setAgo] = useState("");

  useEffect(() => {
    function update() {
      if (!lastUpdated) {
        setAgo("");
        return;
      }
      const diff = Math.round(
        (Date.now() - new Date(lastUpdated).getTime()) / 1000
      );
      if (diff < 60) setAgo(`${diff}s ago`);
      else if (diff < 3600) setAgo(`${Math.floor(diff / 60)}m ago`);
      else setAgo(`${Math.floor(diff / 3600)}h ago`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <nav className="sticky top-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-border">
      <div className="max-w-[1200px] mx-auto px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-text-primary rounded-[7px] flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="w-4 h-4"
            >
              <path d="M12 3v18M3 12l4-4v8M21 12l-4-4v8" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.3px]">
            TTS Benchmark
          </span>
        </div>
        <div className="flex items-center gap-5">
          {ago && (
            <span className="text-xs text-text-muted font-mono">
              Updated {ago}
            </span>
          )}
          <div className="relative w-[7px] h-[7px]">
            <div className="absolute inset-0 bg-green rounded-full" />
            <div className="absolute -inset-[3px] border-[1.5px] border-green rounded-full animate-[pulse_2s_ease-out_infinite]" />
          </div>
        </div>
      </div>
    </nav>
  );
}
