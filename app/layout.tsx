import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = "https://ttsbm.vercel.app";

export const metadata: Metadata = {
  title: "TTS Benchmark — Real-time Text-to-Speech Latency Monitoring",
  description:
    "Compare TTFB (time-to-first-byte) latency across leading TTS providers: Cartesia, ElevenLabs, Deepgram, Fish Audio. Updated 5x daily with 3 runs per probe.",
  keywords: [
    "TTS benchmark",
    "text to speech latency",
    "TTFB",
    "time to first byte",
    "Cartesia",
    "ElevenLabs",
    "Deepgram",
    "Fish Audio",
    "TTS comparison",
    "voice AI latency",
    "real-time TTS",
    "speech synthesis benchmark",
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TTS Benchmark — Real-time TTS Latency Monitoring",
    description:
      "Compare TTFB latency across Cartesia, ElevenLabs, Deepgram, and Fish Audio. Live benchmarks updated 5x daily.",
    url: siteUrl,
    siteName: "TTS Benchmark",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TTS Benchmark — Real-time TTS Latency",
    description:
      "Compare TTFB latency across leading text-to-speech providers. Live data, updated 5x daily.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "TTS Benchmark",
              description:
                "Real-time TTFB latency benchmarks for text-to-speech providers",
              url: siteUrl,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
            }),
          }}
        />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
