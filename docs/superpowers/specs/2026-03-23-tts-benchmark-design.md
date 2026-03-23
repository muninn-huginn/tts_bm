# TTS Benchmark — Design Spec

A public website showing real-time latency benchmarks for text-to-speech providers, with TTFB as the primary metric.

## Goals

- Continuously probe 10 TTS providers and measure TTFB, total response time, and error rates
- Display results on a clean, minimal, public dashboard with charts and status indicators
- Maintain clear separation between backend (probing + API) and frontend (display)
- All config (providers, frequencies, phrases) managed via environment variables and config files — no admin UI

## Architecture

```
Vercel Cron Job (every 1 min → checks which providers are due)
        │
        ▼
Backend — Next.js API Routes (/api/*)
├── /api/cron/probe         — cron entry, runs probe cycle
├── /api/results            — latest results per provider (public GET)
├── /api/results/history    — time-series data for charts (public GET)
└── /api/results/errors     — recent errors (public GET)
        │
        ▼
Neon Postgres
└── probe_results           — time-series measurements
        ▲
        │ (read-only)
Frontend — Next.js App Router
├── Server Components       — initial data fetch
├── Client Components       — charts, time range picker, auto-refresh
└── SWR or polling          — 60s auto-refresh
```

**Key boundary:** Frontend never writes to the database. Backend never renders UI. API routes are the only interface between them.

## Providers (launch set — all configurable)

1. Cartesia (Sonic)
2. ElevenLabs
3. OpenAI (tts-1, tts-1-hd, gpt-4o-mini-tts)
4. Google Cloud TTS
5. Amazon Polly
6. Azure Speech (Microsoft)
7. Deepgram (Aura)
8. PlayHT
9. LMNT
10. Fish Audio

Each provider has:
- Independent probe frequency (configurable, default 5 min)
- Enable/disable toggle
- Provider-specific config (model, voice, endpoint) in JSON

## Data Model

Provider config and probe phrases live in `config/providers.ts` (source of truth). Only probe results are stored in the database.

### `probe_results`

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| provider_id | text | Matches config id (e.g., `cartesia`) |
| phrase_label | text | Matches config phrase label (e.g., `short`) |
| timestamp | timestamptz | When probe ran |
| ttfb_ms | int | Time to first byte |
| total_time_ms | int | Full response time |
| audio_duration_ms | int | Generated audio length (nullable) |
| status_code | int | HTTP status |
| error_message | text | null on success |
| region | text | Probe origin region |

**Indexes:**
- `(provider_id, timestamp DESC)` — dashboard queries
- `(timestamp)` — retention cleanup
- `(provider_id, status_code)` WHERE `status_code >= 400` — error queries

**Retention:** configurable, default 30 days. A daily cron (`/api/cron/cleanup`) deletes old rows.

## Probe System

### How a probe works

1. A single Vercel Cron Job runs every 1 minute, triggering `/api/cron/probe` with `CRON_SECRET` auth
2. Endpoint reads enabled providers from config and checks each provider's last probe timestamp in the DB
3. For each provider whose `probeIntervalSeconds` has elapsed since last probe:
   a. Select a phrase from the enabled set (round-robin or random)
   b. Record `startTime`
   c. Send TTS request via provider adapter
   d. Record `ttfb` when first byte arrives (using streaming response)
   e. Wait for full response, record `totalTime`
   f. Calculate `audioDuration` if possible
   g. Write result to `probe_results`
4. On error: record status code and error message, continue to next provider

### Provider adapters

Each provider gets a dedicated adapter module in `lib/providers/<id>.ts`:

```ts
interface TTSProbeResult {
  ttfbMs: number;
  totalTimeMs: number;
  audioDurationMs: number | null;
  statusCode: number;
  errorMessage: string | null;
}

interface TTSProviderAdapter {
  id: string;
  probe(text: string, config: Record<string, unknown>): Promise<TTSProbeResult>;
}
```

Adapters handle auth, endpoint construction, and response parsing. API keys are read from environment variables — never stored in the database.

### TTFB measurement

The critical measurement. For HTTP-based providers:

```ts
const startTime = performance.now();
const response = await fetch(url, options);
const reader = response.body.getReader();
const { done } = await reader.read(); // first chunk
const ttfb = performance.now() - startTime;
```

For WebSocket-based providers (e.g., Cartesia), measure time from connection open + send to first audio frame.

## API Endpoints

### `GET /api/results`

Returns latest probe result per provider.

```json
{
  "providers": [
    {
      "id": "cartesia",
      "name": "Cartesia",
      "status": "healthy",
      "latest": {
        "ttfbMs": 48,
        "totalTimeMs": 320,
        "statusCode": 200,
        "timestamp": "2026-03-23T14:23:05Z"
      },
      "stats": {
        "p50": 48,
        "p95": 72,
        "p99": 95,
        "uptime24h": 100
      }
    }
  ],
  "updatedAt": "2026-03-23T14:23:05Z"
}
```

### `GET /api/results/history?provider=cartesia,deepgram&range=1h`

Returns time-series for charts. `provider` accepts comma-separated IDs or `all`. Supports: `1h`, `6h`, `24h`, `7d`, `30d`, or `start=<iso>&end=<iso>` for custom range.

For longer ranges (7d, 30d), returns aggregated data (e.g., 5-min or 1-hour buckets with p50/p95/p99).

### `GET /api/results/errors?limit=50`

Returns recent errors across all providers.

## Frontend

### Stack

- Next.js App Router (Server + Client Components)
- Recharts for charts (lightweight, React-native)
- DM Sans + JetBrains Mono fonts
- Tailwind CSS for styling
- SWR for client-side data fetching with 60s revalidation

### Page structure (single page)

1. **Sticky nav** — logo, "Updated Xs ago", pulsing health dot, blurred backdrop
2. **Hero** — "Real-time TTS Latency" title + subtitle
3. **Ranking strip** — horizontal row of provider cards sorted by TTFB p50, each showing value + status badge (healthy/degraded/down)
4. **Two-column section:**
   - Left: TTFB line chart with time range selector (1h/6h/24h/7d/30d + custom date picker)
   - Right: Provider rankings sidebar — all 10 providers listed with p50, p95, status dot
5. **Comparison table** — sortable columns: provider, TTFB p50/p95/p99, total time, 24h uptime bar visualization, uptime %, status
6. **Recent errors** — timestamped list with provider, HTTP status code badge (color-coded 4xx/5xx), error message
7. **Footer** — probe summary, GitHub link

### Visual style

- Clean, minimal, light background (#FCFCFC)
- Restrained palette: black + green primary, yellow/red only for status
- Subtle shadows, 10px border radius
- Staggered fade-up animations on load
- Hover states on all interactive elements
- Uptime bars: small colored ticks showing 24h history (green = ok, yellow = degraded, red = failed)

### Status thresholds (configurable)

- **Healthy**: TTFB p50 < 200ms AND error rate < 5% in last hour
- **Degraded**: TTFB p50 < 500ms OR error rate 5-20%
- **Down**: TTFB p50 >= 500ms OR error rate > 20% OR last 3 probes all failed

## Security

- **CRON_SECRET** header verification on all cron endpoints
- **Rate limiting** on public API endpoints (via Vercel Firewall or in-app middleware)
- **No admin UI** — all configuration via env vars and config files
- **API keys** stored in Vercel environment variables, never in database or client code
- **Read-only public API** — no mutations exposed
- **Input validation** on all API query parameters (range, provider, limit)
- **CORS** restricted to the deployment domain
- Add `.env*.local` to `.gitignore`

## Configuration

All managed via config file (`config/providers.ts`) and environment variables:

```ts
// config/providers.ts
export const providers: ProviderConfig[] = [
  {
    id: 'cartesia',
    name: 'Cartesia',
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: 'cartesia',
    config: {
      model: 'sonic-2',
      voice: 'default',
      apiKeyEnv: 'CARTESIA_API_KEY',
    },
  },
  // ... more providers
];

export const probeConfig = {
  phrases: [
    { label: 'short', text: 'The quick brown fox jumps over the lazy dog.' },
    { label: 'medium', text: 'In a world where technology evolves at breakneck speed, the ability to convert text into natural-sounding speech has become a critical capability for applications ranging from accessibility tools to real-time communication platforms.' },
  ],
  defaultIntervalSeconds: 300,
  retentionDays: 30,
  statusThresholds: {
    healthyTtfbMs: 200,
    degradedTtfbMs: 500,
    errorRateHealthy: 0.05,
    errorRateDegraded: 0.20,
  },
};
```

## Error Handling

- **Provider timeout**: 30s default, configurable per provider. Timeout = error result with appropriate message.
- **Provider rate limit (429)**: Record as error, back off for that provider's next probe cycle.
- **Network errors**: Record with error message, continue probing other providers.
- **Database errors**: Log to Vercel runtime logs, return 500 to cron (Vercel will retry).

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Hosting | Vercel |
| Database | Neon Postgres (via Vercel Marketplace) |
| Cron | Vercel Cron Jobs |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Fonts | DM Sans + JetBrains Mono |
| Data fetching | SWR (client-side, 60s refresh) |
| ORM/Query | Drizzle ORM |

## Out of Scope (for now)

- Admin UI
- User accounts / authentication
- On-demand "test now" button
- WebSocket live updates
- Multi-region probing (single region at launch)
- Audio quality scoring
- Provider cost tracking
- Email/webhook alerts on status changes
