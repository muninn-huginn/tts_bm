import { ImageResponse } from "next/og";
import { providers as providerConfig } from "@/config/providers";

export const alt = "TTS Benchmark — Real-time TTS Latency Monitoring";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OGImage() {
  let providerData: { name: string; ttfb: number; status: string }[] = [];

  try {
    const { getLatestResults } = await import("@/lib/db/queries");
    const { calculateStatus } = await import("@/lib/status");
    const results = await getLatestResults();

    providerData = results
      .map((r) => ({
        name: r.name,
        ttfb: r.stats.p50,
        status: calculateStatus(r.stats.p50, r._errorRate, r._last3),
      }))
      .filter((p) => p.ttfb > 0)
      .sort((a, b) => a.ttfb - b.ttfb);
  } catch {
    // Fallback
  }

  const fastest = providerData[0];
  const maxTtfb = Math.max(...providerData.map((p) => p.ttfb), 1);

  const barColors: Record<string, string> = {
    good: "#00A861",
    fair: "#D97706",
    bad: "#DC2626",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FCFCFC",
          fontFamily: "system-ui, sans-serif",
          padding: "56px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "#111",
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              width="18"
              height="18"
            >
              <path d="M12 3v18M3 12l4-4v8M21 12l-4-4v8" />
            </svg>
          </div>
          <span style={{ fontSize: "20px", fontWeight: 600, color: "#111" }}>
            TTS Benchmark
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "4px" }}>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#111",
              letterSpacing: "-1.5px",
              lineHeight: 1.15,
            }}
          >
            Real-time TTS Latency
          </span>
          <span style={{ fontSize: "19px", color: "#666", marginTop: "4px" }}>
            Time-to-first-byte benchmarks across leading providers
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            flex: 1,
            marginTop: "36px",
          }}
        >
          {providerData.slice(0, 5).map((p) => {
            const widthPct = Math.max((p.ttfb / maxTtfb) * 100, 5);
            const color = barColors[p.status] || "#999";

            return (
              <div
                key={p.name}
                style={{ display: "flex", alignItems: "center", gap: "14px" }}
              >
                <span
                  style={{
                    width: "180px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#111",
                  }}
                >
                  {p.name}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "28px",
                    background: "#F2F2F2",
                    borderRadius: "5px",
                    display: "flex",
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      width: `${widthPct}%`,
                      background: color,
                      borderRadius: "5px",
                      opacity: 0.75,
                      display: "flex",
                    }}
                  />
                </div>
                <span
                  style={{
                    width: "80px",
                    textAlign: "right",
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#111",
                    fontFamily: "monospace",
                  }}
                >
                  {p.ttfb}ms
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #EBEBEB",
          }}
        >
          <span style={{ fontSize: "14px", color: "#999" }}>
            {fastest
              ? `Fastest: ${fastest.name} at ${fastest.ttfb}ms`
              : "Live benchmarks updated 5x daily"}
          </span>
          <span style={{ fontSize: "14px", color: "#999" }}>ttfb.sh</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
