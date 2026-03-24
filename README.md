# TTS Benchmark

Real-time latency benchmarks for text-to-speech providers. Measures Time to First Byte (TTFB) across multiple TTS APIs and displays results on a public dashboard.

**Live:** [ttsbm.vercel.app](https://ttsbm.vercel.app)

## Providers

| Provider | Model |
|----------|-------|
| Cartesia | Sonic 3, Sonic Turbo |
| ElevenLabs | Flash v2.5 |
| Deepgram | Aura 2 (Thalia) |
| Fish Audio | S2 Pro |

## How It Works

- A Vercel Cron Job runs **5 times daily** (01:00, 06:00, 10:00, 14:00, 19:00 UTC)
- Each run probes every provider **3 times** with a test phrase
- TTFB is measured from request start to first audio byte received
- Results are stored in Neon Postgres and displayed on the dashboard

## Dashboard

- **Hero stats** — fastest TTFB and most consistent provider
- **Ranking strip** — providers sorted by avg TTFB with individual run bars
- **TTFB over time** — connected scatter plot showing probe sessions
- **Latency variation** — dot/range plot showing spread per provider
- **TTFB by time of day** — grouped bars per UTC hour with error bars
- **Performance heatmap** — color-coded table (Avg TTFB, P50, P95, P99, Spread)
- **Provider filter** — toggle providers across all visualizations

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Neon Postgres (Drizzle ORM)
- **Charts:** Recharts
- **Styling:** Tailwind CSS
- **Fonts:** DM Sans + JetBrains Mono
- **Data fetching:** SWR (60s auto-refresh)
- **Hosting:** Vercel

## Setup

```bash
# Clone and install
git clone https://github.com/muninn-huginn/tts_bm.git
cd tts_bm
npm install

# Link to Vercel and pull env vars
vercel link
vercel env pull .env.local

# Push database schema
npx drizzle-kit push

# Run locally
npm run dev
```

### Required Environment Variables

```
DATABASE_URL          # Neon Postgres connection string
CRON_SECRET           # Bearer token for cron endpoint auth
CARTESIA_API_KEY      # Cartesia API key
ELEVENLABS_API_KEY    # ElevenLabs API key
DEEPGRAM_API_KEY      # Deepgram API key
FISH_API_KEY          # Fish Audio API key
```

## Adding a Provider

1. Create an adapter in `lib/providers/<name>.ts` implementing `TTSProviderAdapter`
2. Import it in `lib/providers/all.ts`
3. Add config entry in `config/providers.ts`
4. Set the API key env var in Vercel
5. Deploy

## License

MIT
