"use client";

import useSWR from "swr";
import { providers as providerConfig } from "@/config/providers";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const nameMap = new Map(providerConfig.map((p) => [p.id, p.name]));

interface ErrorEntry {
  providerId: string;
  providerName: string;
  timestamp: string;
  statusCode: number;
  errorMessage: string | null;
}

export function ErrorList() {
  const { data } = useSWR<ErrorEntry[]>("/api/results/errors?limit=20", fetcher, {
    refreshInterval: 60_000,
  });

  const errors = data || [];

  if (errors.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-[10px] px-[22px] py-8 text-center text-text-muted text-sm shadow-sm">
        No recent errors
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-[10px] shadow-sm overflow-hidden">
      {errors.map((e, i) => {
        const time = new Date(e.timestamp);
        const timeStr = time.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        const is5xx = e.statusCode >= 500;
        const codeClass = is5xx
          ? "bg-red-bg text-red"
          : "bg-yellow-bg text-yellow";

        return (
          <div
            key={`${e.providerId}-${e.timestamp}-${i}`}
            className="grid grid-cols-[80px_110px_60px_1fr] gap-4 items-center px-[22px] py-3 border-b border-border-subtle last:border-b-0 hover:bg-surface-hover transition-colors"
          >
            <span className="font-mono text-[11px] text-text-muted whitespace-nowrap">
              {timeStr}
            </span>
            <span className="text-[12px] font-semibold text-text-primary">
              {nameMap.get(e.providerId) || e.providerId}
            </span>
            <span
              className={`font-mono text-[11px] font-semibold px-[7px] py-[2px] rounded text-center ${codeClass}`}
            >
              {e.statusCode || "ERR"}
            </span>
            <span className="text-[12px] text-text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
              {e.errorMessage || "Unknown error"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
