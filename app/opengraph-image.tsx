import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TTS Benchmark — Real-time TTS Latency Monitoring";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  // Fetch live data
  let providers: {
    name: string;
    status: string;
    batch?: { avgTtfb: number } | null;
    stats: { p50: number };
  }[] = [];

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/results`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      providers = data.providers || [];
    }
  } catch {
    // Fall back to static image
  }

  const sorted = [...providers].sort(
    (a, b) =>
      (a.batch?.avgTtfb || a.stats.p50 || Infinity) -
      (b.batch?.avgTtfb || b.stats.p50 || Infinity)
  );

  const fastest = sorted[0];
  const fastestTtfb = fastest
    ? fastest.batch?.avgTtfb || fastest.stats.p50
    : null;

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
          padding: "60px 72px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "#111",
              borderRadius: "8px",
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
              width="20"
              height="20"
            >
              <path d="M12 3v18M3 12l4-4v8M21 12l-4-4v8" />
            </svg>
          </div>
          <span
            style={{
              fontSize: "22px",
              fontWeight: 600,
              color: "#111",
              letterSpacing: "-0.3px",
            }}
          >
            TTS Benchmark
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 700,
            color: "#111",
            letterSpacing: "-1.5px",
            lineHeight: 1.15,
            marginBottom: "6px",
          }}
        >
          Real-time TTS Latency
        </div>
        <div
          style={{
            fontSize: "20px",
            color: "#666",
            marginBottom: "44px",
          }}
        >
          Time-to-first-byte benchmarks across leading providers
        </div>

        {/* Provider bars */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            flex: 1,
          }}
        >
          {sorted.slice(0, 5).map((p) => {
            const ttfb = p.batch?.avgTtfb || p.stats.p50 || 0;
            const maxBar = Math.max(
              ...sorted.slice(0, 5).map((s) => s.batch?.avgTtfb || s.stats.p50 || 0),
              1
            );
            const width = Math.max((ttfb / maxBar) * 100, 5);
            const color = barColors[p.status] || "#999";

            return (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "160px",
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "#111",
                    flexShrink: 0,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: "32px",
                    background: "#F2F2F2",
                    borderRadius: "6px",
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${width}%`,
                      height: "100%",
                      background: color,
                      borderRadius: "6px",
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: "80px",
                    textAlign: "right",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#111",
                    fontFamily: "monospace",
                    flexShrink: 0,
                  }}
                >
                  {ttfb > 0 ? `${ttfb}ms` : "—"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid #EBEBEB",
          }}
        >
          <span style={{ fontSize: "15px", color: "#999" }}>
            {fastestTtfb
              ? `Fastest: ${fastest.name} at ${fastestTtfb}ms`
              : "Live benchmarks updated 5x daily"}
          </span>
          <span style={{ fontSize: "15px", color: "#999" }}>
            ttfb.sh
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
