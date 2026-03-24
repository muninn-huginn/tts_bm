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
      else if (diff < 86400) setAgo(`${Math.floor(diff / 3600)}h ago`);
      else setAgo(`${Math.floor(diff / 86400)}d ago`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <nav className="sticky top-0 z-50 bg-bg/90 backdrop-blur-lg border-b border-border">
      <div className="max-w-[1200px] mx-auto px-8 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 20 20"
            className="w-[18px] h-[18px] text-text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M10 2v16M3 10l3.5-3.5v7M17 10l-3.5-3.5v7" />
          </svg>
          <span className="text-[14px] font-semibold tracking-[-0.2px] text-text-primary">
            TTS Benchmark
          </span>
        </div>
        {ago && (
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-text-muted font-mono">
              Last probe {ago}
            </span>
            <div className="relative w-1.5 h-1.5">
              <div className="absolute inset-0 bg-green rounded-full" />
              <div className="absolute -inset-1 border border-green rounded-full opacity-0 animate-[pulse_2s_ease-out_infinite]" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
