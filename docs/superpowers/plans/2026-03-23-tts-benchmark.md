# TTS Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public dashboard that continuously benchmarks TTFB for 10 TTS providers, displaying results with charts, rankings, and error tracking.

**Architecture:** Next.js 16 App Router on Vercel. Cron-triggered serverless functions probe TTS providers and write results to Neon Postgres. A single-page frontend reads via API routes and renders with Recharts + Tailwind. Config lives in TypeScript files, not the database.

**Tech Stack:** Next.js 16, Drizzle ORM, Neon Postgres, Recharts, SWR, Tailwind CSS, DM Sans + JetBrains Mono

**Spec:** `docs/superpowers/specs/2026-03-23-tts-benchmark-design.md`

**Dashboard mockup:** `.superpowers/brainstorm/58035-1774259437/dashboard-v2.html`

---

## File Structure

```
tts_bm/
├── app/
│   ├── layout.tsx                    # Root layout: fonts, metadata, global styles
│   ├── page.tsx                      # Homepage: Server Component shell, fetches initial data
│   ├── globals.css                   # Tailwind directives + CSS variables
│   └── api/
│       ├── cron/
│       │   ├── probe/route.ts        # Cron endpoint: run due probes
│       │   └── cleanup/route.ts      # Cron endpoint: delete old rows
│       └── results/
│           ├── route.ts              # GET /api/results — latest per provider
│           ├── history/route.ts      # GET /api/results/history — time-series
│           └── errors/route.ts       # GET /api/results/errors — recent errors
├── components/
│   ├── nav.tsx                       # Sticky nav with logo, timestamp, health dot
│   ├── ranking-strip.tsx             # Horizontal provider cards sorted by TTFB
│   ├── ttfb-chart.tsx                # Recharts line chart + time range selector
│   ├── provider-sidebar.tsx          # Rankings sidebar (all 10 providers)
│   ├── comparison-table.tsx          # Sortable detailed table with uptime bars
│   ├── error-list.tsx                # Recent errors with status code badges
│   └── time-range-picker.tsx         # Pill buttons + custom date picker
├── lib/
│   ├── db/
│   │   ├── index.ts                  # Drizzle client (Neon serverless)
│   │   ├── schema.ts                 # Drizzle schema: probe_results table
│   │   └── queries.ts                # Reusable query functions (latest, history, errors, stats)
│   ├── providers/
│   │   ├── types.ts                  # TTSProviderAdapter interface, TTSProbeResult type
│   │   ├── registry.ts               # Map of provider ID → adapter instance
│   │   ├── base-http.ts              # Shared HTTP TTFB measurement logic
│   │   ├── cartesia.ts               # Cartesia adapter (WebSocket)
│   │   ├── elevenlabs.ts             # ElevenLabs adapter (HTTP streaming)
│   │   ├── openai.ts                 # OpenAI adapter (HTTP)
│   │   ├── google.ts                 # Google Cloud TTS adapter
│   │   ├── polly.ts                  # Amazon Polly adapter
│   │   ├── azure.ts                  # Azure Speech adapter
│   │   ├── deepgram.ts               # Deepgram Aura adapter
│   │   ├── playht.ts                 # PlayHT adapter
│   │   ├── lmnt.ts                   # LMNT adapter
│   │   └── fish.ts                   # Fish Audio adapter
│   ├── probe-runner.ts               # Orchestrator: check due providers, run probes, write results
│   └── status.ts                     # Status calculation (healthy/degraded/down from config thresholds)
├── config/
│   ├── providers.ts                  # Provider definitions (id, name, enabled, interval, adapter config)
│   └── probe.ts                      # Probe config (phrases, thresholds, retention)
├── drizzle.config.ts                 # Drizzle Kit config for migrations
├── drizzle/                          # Generated migrations
├── vercel.json                       # Cron schedules
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config with custom theme
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `.gitignore`, `vercel.json`, `.env.local.example`

- [ ] **Step 1: Initialize Next.js project**

Run: `cd /Users/arnon/dev/tts_bm && npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack`

Accept defaults. This creates the base Next.js 16 project with Tailwind.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install drizzle-orm @neondatabase/serverless swr recharts date-fns
npm install -D drizzle-kit @types/node
```

- [ ] **Step 3: Create `.gitignore` additions**

Append to `.gitignore`:
```
.env*.local
.superpowers/
.DS_Store
```

- [ ] **Step 4: Create `.env.local.example`**

Create `.env.local.example` with all required env vars (no values):
```
DATABASE_URL=
CRON_SECRET=
CARTESIA_API_KEY=
ELEVENLABS_API_KEY=
OPENAI_API_KEY=
GOOGLE_TTS_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
DEEPGRAM_API_KEY=
PLAYHT_API_KEY=
PLAYHT_USER_ID=
LMNT_API_KEY=
FISH_API_KEY=
```

- [ ] **Step 5: Configure `vercel.json` with cron jobs**

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/probe",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

- [ ] **Step 6: Set up Tailwind theme with custom fonts and design tokens**

Update `tailwind.config.ts` to add:
- DM Sans as `fontFamily.sans`
- JetBrains Mono as `fontFamily.mono`
- Custom colors matching the mockup (surface, border, text hierarchy, green/yellow/red status)
- Custom border radius values

Update `app/globals.css` with CSS variables matching the mockup:
```css
@import "tailwindcss";

:root {
  --bg: #FCFCFC;
  --surface: #FFFFFF;
  --surface-hover: #F8F9FA;
  --border: #EBEBEB;
  --border-subtle: #F2F2F2;
  --text-primary: #111111;
  --text-secondary: #666666;
  --text-muted: #999999;
  --text-faint: #BBBBBB;
  --green: #00A861;
  --green-bg: #EDFCF4;
  --yellow: #D97706;
  --yellow-bg: #FFFBEB;
  --red: #DC2626;
  --red-bg: #FEF2F2;
}
```

- [ ] **Step 7: Update `app/layout.tsx` with fonts**

Import DM Sans and JetBrains Mono via `next/font/google`. Apply to `<html>` className. Set metadata title: "TTS Benchmark — Real-time TTS Latency Monitoring".

- [ ] **Step 8: Set up placeholder `app/page.tsx`**

Simple Server Component:
```tsx
export default function Home() {
  return <main className="min-h-screen bg-[var(--bg)]"><p>TTS Benchmark</p></main>;
}
```

- [ ] **Step 9: Initialize git repo and commit**

Run:
```bash
cd /Users/arnon/dev/tts_bm
git init
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, Drizzle, Recharts deps"
```

- [ ] **Step 10: Verify dev server starts**

Run: `npm run dev`
Expected: App loads at localhost:3000 with "TTS Benchmark" text, no errors.

---

## Task 2: Database Schema + Drizzle Setup

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle schema**

Create `lib/db/schema.ts`:
```ts
import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const probeResults = pgTable("probe_results", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  phraseLabel: text("phrase_label").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  ttfbMs: integer("ttfb_ms").notNull(),
  totalTimeMs: integer("total_time_ms").notNull(),
  audioDurationMs: integer("audio_duration_ms"),
  statusCode: integer("status_code").notNull(),
  errorMessage: text("error_message"),
  region: text("region"),
});
```

Add indexes:
- `(provider_id, timestamp DESC)`
- `(timestamp)`
- Partial index on `(provider_id, status_code)` WHERE `status_code >= 400`

- [ ] **Step 2: Create Drizzle client**

Create `lib/db/index.ts`:
```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 3: Create Drizzle config**

Create `drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Generate initial migration**

Run: `npx drizzle-kit generate`
Expected: Creates migration SQL in `drizzle/` folder.

- [ ] **Step 5: Commit**

```bash
git add lib/db/ drizzle.config.ts drizzle/
git commit -m "feat: add Drizzle schema for probe_results with indexes"
```

---

## Task 3: Config Files

**Files:**
- Create: `config/providers.ts`, `config/probe.ts`

- [ ] **Step 1: Create provider config types and data**

Create `config/providers.ts` with:
- `ProviderConfig` type: `{ id, name, enabled, probeIntervalSeconds, adapter, config: { apiKeyEnv, model?, voice?, endpoint?, ... } }`
- Array of all 10 providers with sensible defaults (all enabled, 300s interval)
- Each provider references its `apiKeyEnv` (e.g., `CARTESIA_API_KEY`)

- [ ] **Step 2: Create probe config**

Create `config/probe.ts` with:
- `phrases` array: short + medium test texts
- `defaultIntervalSeconds: 300`
- `retentionDays: 30`
- `statusThresholds`: healthyTtfbMs: 200, degradedTtfbMs: 500, errorRateHealthy: 0.05, errorRateDegraded: 0.20
- `probeTimeoutMs: 30000`

- [ ] **Step 3: Commit**

```bash
git add config/
git commit -m "feat: add provider and probe configuration"
```

---

## Task 4: Provider Adapter Interface + Base HTTP Helper

**Files:**
- Create: `lib/providers/types.ts`, `lib/providers/base-http.ts`, `lib/providers/registry.ts`

- [ ] **Step 1: Create types**

Create `lib/providers/types.ts`:
```ts
export interface TTSProbeResult {
  ttfbMs: number;
  totalTimeMs: number;
  audioDurationMs: number | null;
  statusCode: number;
  errorMessage: string | null;
}

export interface TTSProviderAdapter {
  id: string;
  probe(text: string, config: Record<string, unknown>): Promise<TTSProbeResult>;
}
```

- [ ] **Step 2: Create base HTTP measurement helper**

Create `lib/providers/base-http.ts`:
- Export `measureHttpTTFB(url, options)` that:
  1. Records `performance.now()` start
  2. Calls `fetch(url, options)` with AbortController timeout
  3. On success: reads first chunk from `response.body.getReader()` → TTFB
  4. Reads remaining chunks → totalTime
  5. Returns `TTSProbeResult`
  6. On error: returns result with statusCode (from response or 0 for network), errorMessage

- [ ] **Step 3: Create provider registry**

Create `lib/providers/registry.ts`:
- Import all adapter instances (will be created in next tasks)
- Export `getAdapter(id: string): TTSProviderAdapter | undefined`
- For now, export an empty map — adapters will be added as they're built

- [ ] **Step 4: Commit**

```bash
git add lib/providers/
git commit -m "feat: add provider adapter interface and base HTTP measurement"
```

---

## Task 5: Provider Adapters (Batch 1 — HTTP-based)

**Files:**
- Create: `lib/providers/openai.ts`, `lib/providers/elevenlabs.ts`, `lib/providers/deepgram.ts`, `lib/providers/google.ts`, `lib/providers/azure.ts`

Each adapter implements `TTSProviderAdapter`. All follow the same pattern:
1. Read API key from `process.env[config.apiKeyEnv]`
2. Construct request (URL, headers, body) per provider's API
3. Call `measureHttpTTFB` or custom streaming measurement
4. Return `TTSProbeResult`

- [ ] **Step 1: OpenAI adapter**

Create `lib/providers/openai.ts`:
- POST to `https://api.openai.com/v1/audio/speech`
- Body: `{ model: config.model || 'tts-1', input: text, voice: config.voice || 'alloy', response_format: 'mp3' }`
- Auth: `Authorization: Bearer $OPENAI_API_KEY`
- Uses `baseHttpProbe()` from `base-http.ts`

- [ ] **Step 2: ElevenLabs adapter**

Create `lib/providers/elevenlabs.ts`:
- POST to `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream`
- Body: `{ text, model_id: config.model || 'eleven_flash_v2_5' }`
- Auth: `xi-api-key: $ELEVENLABS_API_KEY`
- Streaming response — measure TTFB from first chunk

- [ ] **Step 3: Deepgram adapter**

Create `lib/providers/deepgram.ts`:
- POST to `https://api.deepgram.com/v1/speak`
- Query params: `model=aura-asteria-en`
- Body: `{ text }`
- Auth: `Authorization: Token $DEEPGRAM_API_KEY`

- [ ] **Step 4: Google Cloud TTS adapter**

Create `lib/providers/google.ts`:
- POST to `https://texttospeech.googleapis.com/v1/text:synthesize?key=$GOOGLE_TTS_API_KEY`
- Body: `{ input: { text }, voice: { languageCode: 'en-US', name: config.voice }, audioConfig: { audioEncoding: 'MP3' } }`
- Google returns base64 audio in JSON, so TTFB = time to first byte of JSON response

- [ ] **Step 5: Azure Speech adapter**

Create `lib/providers/azure.ts`:
- POST to `https://{region}.tts.speech.microsoft.com/cognitiveservices/v1`
- SSML body with voice name
- Auth: `Ocp-Apim-Subscription-Key: $AZURE_SPEECH_KEY`
- Streaming audio response

- [ ] **Step 6: Register adapters in registry**

Update `lib/providers/registry.ts` to import and register all 5 adapters.

- [ ] **Step 7: Commit**

```bash
git add lib/providers/
git commit -m "feat: add provider adapters — OpenAI, ElevenLabs, Deepgram, Google, Azure"
```

---

## Task 6: Provider Adapters (Batch 2 — Remaining)

**Files:**
- Create: `lib/providers/cartesia.ts`, `lib/providers/polly.ts`, `lib/providers/playht.ts`, `lib/providers/lmnt.ts`, `lib/providers/fish.ts`

- [ ] **Step 1: Cartesia adapter**

Create `lib/providers/cartesia.ts`:
- Cartesia uses WebSocket or HTTP streaming API
- POST to `https://api.cartesia.ai/tts/bytes` (HTTP streaming) or WebSocket at `wss://api.cartesia.ai/tts/websocket`
- For simplicity at launch, use HTTP streaming endpoint
- Auth: `X-API-Key: $CARTESIA_API_KEY`
- Body: `{ model_id: config.model || 'sonic-2', transcript: text, voice: { mode: 'id', id: config.voice }, output_format: { container: 'mp3', ... } }`

- [ ] **Step 2: Amazon Polly adapter**

Create `lib/providers/polly.ts`:
- Uses AWS SDK v3 `@aws-sdk/client-polly` — add to dependencies
- `SynthesizeSpeechCommand` with `Engine: 'neural'`, `OutputFormat: 'mp3'`
- Wrap with timing: start → send command → first byte of AudioStream → total
- Auth: standard AWS env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)

Run: `npm install @aws-sdk/client-polly`

- [ ] **Step 3: PlayHT adapter**

Create `lib/providers/playht.ts`:
- POST to `https://api.play.ht/api/v2/tts/stream`
- Body: `{ text, voice: config.voice, output_format: 'mp3', quality: 'draft' }`
- Auth: `Authorization: Bearer $PLAYHT_API_KEY`, `X-User-Id: $PLAYHT_USER_ID`
- Streaming response

- [ ] **Step 4: LMNT adapter**

Create `lib/providers/lmnt.ts`:
- POST to `https://api.lmnt.com/v1/ai/speech`
- Body: `{ text, voice: config.voice || 'lily', format: 'mp3' }`
- Auth: `X-API-Key: $LMNT_API_KEY`

- [ ] **Step 5: Fish Audio adapter**

Create `lib/providers/fish.ts`:
- POST to `https://api.fish.audio/v1/tts`
- Body: `{ text, reference_id: config.voice }`
- Auth: `Authorization: Bearer $FISH_API_KEY`
- Streaming audio response

- [ ] **Step 6: Register all adapters in registry**

Update `lib/providers/registry.ts` to import and register all 10 adapters.

- [ ] **Step 7: Commit**

```bash
git add lib/providers/ package.json package-lock.json
git commit -m "feat: add provider adapters — Cartesia, Polly, PlayHT, LMNT, Fish Audio"
```

---

## Task 7: Probe Runner + Cron Endpoints

**Files:**
- Create: `lib/probe-runner.ts`, `lib/db/queries.ts` (partial — `getLastProbeTimestamps` only), `app/api/cron/probe/route.ts`, `app/api/cron/cleanup/route.ts`

- [ ] **Step 1: Create `getLastProbeTimestamps` query**

Create `lib/db/queries.ts` with just the one function needed by the probe runner:
```ts
// getLastProbeTimestamps(): Record<string, Date>
// For each provider_id, get MAX(timestamp) from probe_results
```

The remaining query functions will be added in Task 8.

- [ ] **Step 2: Create probe runner**

Create `lib/probe-runner.ts`:
```ts
// runDueProbes():
// 1. Read enabled providers from config
// 2. Call getLastProbeTimestamps() to check what's due
// 3. If elapsed > provider.probeIntervalSeconds, run probe
// 4. Select phrase (round-robin based on probe count % phrase count)
// 5. Get adapter from registry
// 6. Call adapter.probe(phrase.text, provider.config) with try/catch
// 7. Insert result into probe_results
// 8. Return summary of what ran
```

Key: probes run sequentially per invocation (not parallel) to avoid hitting multiple providers simultaneously from one function. Each cron invocation handles all due providers.

- [ ] **Step 2: Create cron probe endpoint**

Create `app/api/cron/probe/route.ts`:
```ts
import { runDueProbes } from "@/lib/probe-runner";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const summary = await runDueProbes();
  return Response.json(summary);
}
```

- [ ] **Step 3: Create cleanup endpoint**

Create `app/api/cron/cleanup/route.ts`:
- Verify `CRON_SECRET`
- Delete from `probe_results` where `timestamp < now() - retentionDays`
- Return count of deleted rows

- [ ] **Step 4: Commit**

```bash
git add lib/probe-runner.ts app/api/cron/
git commit -m "feat: add probe runner and cron endpoints"
```

---

## Task 8: Database Query Functions (Remaining)

**Files:**
- Modify: `lib/db/queries.ts` (add remaining query functions)
- Create: `lib/status.ts`

- [ ] **Step 1: Create status calculation helper**

Create `lib/status.ts`:
- `calculateStatus(p50: number, errorRate: number, lastNProbes: { statusCode: number }[]): 'healthy' | 'degraded' | 'down'`
- Uses thresholds from `config/probe.ts`

- [ ] **Step 2: Create query functions**

Create `lib/db/queries.ts` with these functions:

`getLatestResults()`:
- For each enabled provider, get latest probe result
- Calculate p50, p95, p99 over last 1 hour
- Calculate 24h uptime percentage
- Calculate status using `lib/status.ts`
- Return sorted by p50 ascending (fastest first)

`getHistory(providerIds: string[], range: string | { start: string, end: string })`:
- Parse range into start/end timestamps
- For short ranges (1h, 6h): return raw data points
- For long ranges (7d, 30d): aggregate into buckets (5-min for 7d, 1-hour for 30d) with p50/p95/p99
- Return `{ providerId, points: { timestamp, ttfbMs, totalTimeMs }[] }[]`

`getRecentErrors(limit: number)`:
- Query probe_results WHERE status_code >= 400 OR error_message IS NOT NULL
- ORDER BY timestamp DESC, LIMIT

`getLastProbeTimestamps()`:
- For each provider_id, get MAX(timestamp) — used by probe runner to check what's due

- [ ] **Step 3: Commit**

```bash
git add lib/db/queries.ts lib/status.ts
git commit -m "feat: add database query functions and status calculation"
```

---

## Task 9: Public API Routes

**Files:**
- Create: `app/api/results/route.ts`, `app/api/results/history/route.ts`, `app/api/results/errors/route.ts`

- [ ] **Step 1: Create `/api/results` endpoint**

Create `app/api/results/route.ts`:
- GET handler
- Calls `getLatestResults()`
- Returns JSON matching the spec schema
- Set `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`

- [ ] **Step 2: Create `/api/results/history` endpoint**

Create `app/api/results/history/route.ts`:
- GET handler
- Parse query params: `provider` (comma-separated or `all`), `range` (preset or `start`/`end`)
- Validate: provider IDs must exist in config, range must be valid
- Calls `getHistory()`
- Returns JSON array of provider time-series
- Set `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`

- [ ] **Step 3: Create `/api/results/errors` endpoint**

Create `app/api/results/errors/route.ts`:
- GET handler
- Parse query param: `limit` (default 50, max 200)
- Calls `getRecentErrors(limit)`
- Returns JSON array of errors
- Set `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`

- [ ] **Step 4: Commit**

```bash
git add app/api/results/
git commit -m "feat: add public API routes for results, history, and errors"
```

---

## Task 10: Frontend — Layout, Nav, Hero

**Files:**
- Modify: `app/layout.tsx`, `app/globals.css`
- Create: `components/nav.tsx`

- [ ] **Step 1: Finalize `app/layout.tsx`**

- Import DM Sans (weights 300–700) and JetBrains Mono (400, 500, 600) via `next/font/google`
- Apply font CSS variables to `<html>`
- Set `<body>` className with bg color, antialiased text

- [ ] **Step 2: Finalize `app/globals.css`**

- Full CSS variable set from the mockup
- Tailwind `@theme` extension for custom colors
- Keyframes for `fadeUp` and `pulse` animations

- [ ] **Step 3: Create `components/nav.tsx`**

Client component (needs "Updated Xs ago" timer):
- Sticky top, blurred backdrop
- Logo (icon + "TTS Benchmark")
- Right side: "Updated Xs ago" (updates every second from a `lastUpdated` prop), pulsing green dot
- Match mockup styles exactly

- [ ] **Step 4: Update `app/page.tsx` with nav + hero**

```tsx
export default function Home() {
  return (
    <>
      <Nav />
      <div className="max-w-[1200px] mx-auto px-8 pt-12">
        <h1 className="text-[32px] font-bold tracking-tight">Real-time TTS Latency</h1>
        <p className="text-[15px] text-[var(--text-secondary)] mt-1.5 max-w-[480px]">
          Continuous benchmarks measuring time-to-first-byte across leading text-to-speech providers.
        </p>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`
Expected: Sticky nav with logo + pulsing dot, hero text. Clean, matches mockup.

- [ ] **Step 6: Commit**

```bash
git add app/ components/nav.tsx
git commit -m "feat: add layout, nav, and hero section"
```

---

## Task 11: Frontend — Ranking Strip

**Files:**
- Create: `components/ranking-strip.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create ranking strip component**

Create `components/ranking-strip.tsx`:
- Props: `providers: { id, name, p50, status }[]` (already sorted by p50)
- Horizontal flex row with 1px gap (border between items)
- Each item shows: rank #, provider name, TTFB value + "ms" unit, status badge (healthy/degraded/down)
- Bottom color bar per status
- Match mockup styles: rank-position, rank-value typography, status pill colors

- [ ] **Step 2: Wire into page with SWR**

Update `app/page.tsx`:
- Add a client wrapper component that uses SWR to fetch `/api/results` with 60s refresh
- Pass provider data to `<RankingStrip />`
- Show skeleton/loading state while data loads

- [ ] **Step 3: Verify with mock data**

For now, can use placeholder data until cron is running. Verify layout matches mockup.

- [ ] **Step 4: Commit**

```bash
git add components/ranking-strip.tsx app/page.tsx
git commit -m "feat: add ranking strip component with SWR data fetching"
```

---

## Task 12: Frontend — TTFB Chart + Time Range Picker

**Files:**
- Create: `components/ttfb-chart.tsx`, `components/time-range-picker.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create time range picker**

Create `components/time-range-picker.tsx`:
- Props: `value: string, onChange: (range) => void`
- Pill buttons: 1h, 6h, 24h, 7d, 30d (active state: black bg, white text)
- "Custom" pill with dashed border — opens a date range popover (two date inputs)
- Match mockup styling

- [ ] **Step 2: Create TTFB chart**

Create `components/ttfb-chart.tsx`:
- Client component using Recharts `LineChart`
- Props: `data: { providerId: string, points: { timestamp, ttfbMs }[] }[]`
- One line per provider with distinct colors
- Y axis: milliseconds, X axis: time
- Grid lines, clean labels in JetBrains Mono
- Legend below chart with colored dots
- Tooltip on hover showing exact values
- Responsive container

- [ ] **Step 3: Wire together with SWR**

In `app/page.tsx`, add:
- State for selected time range (default: `1h`)
- SWR fetch to `/api/results/history?provider=all&range={range}`
- Two-column grid: chart (left), sidebar (right — built in next task)
- Pass data to `<TTFBChart />`
- Time range picker above chart

- [ ] **Step 4: Verify**

Check chart renders with responsive sizing, time range switching works.

- [ ] **Step 5: Commit**

```bash
git add components/ttfb-chart.tsx components/time-range-picker.tsx app/page.tsx
git commit -m "feat: add TTFB chart with time range picker"
```

---

## Task 13: Frontend — Provider Sidebar

**Files:**
- Create: `components/provider-sidebar.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create provider sidebar**

Create `components/provider-sidebar.tsx`:
- Card component showing all 10 providers ranked
- Each row: rank number, provider name, p95 (muted), p50 value, status dot
- Hover state on rows
- Header: "Provider Rankings" + "p50 · 1h"
- Match mockup styling exactly

- [ ] **Step 2: Wire into two-column layout**

Update `app/page.tsx`:
- Place `<ProviderSidebar />` in the right column alongside the chart
- Uses same SWR data from `/api/results`

- [ ] **Step 3: Commit**

```bash
git add components/provider-sidebar.tsx app/page.tsx
git commit -m "feat: add provider rankings sidebar"
```

---

## Task 14: Frontend — Comparison Table

**Files:**
- Create: `components/comparison-table.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create comparison table**

Create `components/comparison-table.tsx`:
- Client component (sortable)
- Columns: Provider (icon + name), TTFB p50, p95, p99, Total Time, Uptime 24h (visual bar), Uptime %, Status
- Sortable by clicking column headers (default: sort by p50 ASC)
- Provider icon: 2-letter abbreviation in a rounded square
- Uptime bar: horizontal row of small ticks, colored per probe status
- Row highlighting: yellow tint for degraded, red tint for down
- Hover state on rows
- Match mockup typography and spacing

- [ ] **Step 2: Wire into page**

Add `<ComparisonTable />` below the chart section in `app/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/comparison-table.tsx app/page.tsx
git commit -m "feat: add sortable comparison table with uptime bars"
```

---

## Task 15: Frontend — Error List + Footer

**Files:**
- Create: `components/error-list.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create error list**

Create `components/error-list.tsx`:
- SWR fetch to `/api/results/errors?limit=20`
- Grid layout: timestamp (mono), provider name, status code badge, error message
- Status code badges: red bg for 5xx, yellow bg for 4xx
- Empty state: "No recent errors" message
- Match mockup styling

- [ ] **Step 2: Add footer**

Add footer to `app/page.tsx`:
- "TTS Benchmark · Probing 10 providers every 1–15 min"
- GitHub link (placeholder href)
- Top border, muted text

- [ ] **Step 3: Add staggered animations**

Add `animate-in` class with `fadeUp` animation and staggered delays to each section in `app/page.tsx`.

- [ ] **Step 4: Verify full page**

Run dev server, verify all sections render correctly with the mockup as reference. Check:
- Nav sticks on scroll with blur
- Ranking strip is horizontally laid out
- Chart + sidebar are side by side
- Table is sortable
- Error list shows formatted entries
- Animations stagger on load
- Responsive behavior (collapses to single column on mobile)

- [ ] **Step 5: Commit**

```bash
git add components/error-list.tsx app/page.tsx
git commit -m "feat: add error list, footer, and page animations"
```

---

## Task 16: Database Migration + Integration Test

**Files:**
- Modify: `package.json` (add migration script)

- [ ] **Step 1: Add npm scripts**

Add to `package.json` scripts:
```json
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 2: Push schema to database**

Requires `DATABASE_URL` in `.env.local` pointing to a Neon database.

Run: `npm run db:push`
Expected: Table `probe_results` created with all columns and indexes.

- [ ] **Step 3: Manual smoke test of probe endpoint**

Run dev server, then:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/probe
```

Expected: JSON response showing which providers were probed (will only work for providers whose API keys are configured).

- [ ] **Step 4: Verify data in API**

```bash
curl http://localhost:3000/api/results
curl "http://localhost:3000/api/results/history?provider=all&range=1h"
curl http://localhost:3000/api/results/errors
```

Expected: JSON responses (may be empty if no probes succeeded yet, but no 500 errors).

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat: add db scripts and verify integration"
```

---

## Task 17: Security Hardening

**Files:**
- Modify: `app/api/cron/probe/route.ts`, `app/api/cron/cleanup/route.ts`
- Modify: `app/api/results/route.ts`, `app/api/results/history/route.ts`, `app/api/results/errors/route.ts`

- [ ] **Step 1: Ensure CRON_SECRET check on all cron routes**

Verify both cron endpoints check `Authorization: Bearer $CRON_SECRET` and return 401 on mismatch.

- [ ] **Step 2: Add input validation to public API routes**

- `/api/results/history`: validate `range` is one of the presets or valid ISO dates, validate `provider` IDs exist in config
- `/api/results/errors`: validate `limit` is a number between 1 and 200

Return 400 with descriptive error on invalid input.

- [ ] **Step 3: Add CORS headers**

Add `Access-Control-Allow-Origin` header to public API routes. For now, allow `*` (can restrict to deployment domain later).

- [ ] **Step 4: Add Cache-Control headers**

Ensure all public API routes set appropriate `Cache-Control` headers (already specified in Task 9, verify they're present).

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: add input validation, CORS, and cache headers to API routes"
```

---

## Task 18: Final Polish + Deploy Prep

**Files:**
- Modify: `app/page.tsx`, various components
- Create: `app/favicon.ico` (optional)

- [ ] **Step 1: Add loading skeletons**

Add skeleton/shimmer states to:
- Ranking strip (gray placeholder cards)
- Chart area (empty chart with loading indicator)
- Table (gray rows)
- Error list (gray rows)

These show while SWR is fetching initial data.

- [ ] **Step 2: Add error boundaries**

Wrap each dashboard section in error boundaries that show a clean "Failed to load" message instead of crashing the page.

- [ ] **Step 3: Add responsive breakpoints**

- Ranking strip: scroll horizontally on mobile, show 2-3 cards at a time
- Two-column layout: stack vertically on mobile (chart on top, sidebar below)
- Table: horizontally scrollable on mobile
- Reduce padding on mobile

- [ ] **Step 4: Add metadata**

In `app/layout.tsx`:
- OpenGraph title/description/image
- Favicon
- `<meta name="robots" content="index, follow" />`

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: Builds successfully with no errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add loading states, error boundaries, responsive design, metadata"
```

- [ ] **Step 7: Deploy to Vercel**

Run: `vercel`
Verify:
- Preview deployment works
- Cron jobs are registered (visible in Vercel dashboard)
- API routes respond correctly
- Dashboard renders with real data (once cron starts probing)

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffold | package.json, layout, tailwind, vercel.json |
| 2 | DB schema + Drizzle | lib/db/schema.ts, drizzle config |
| 3 | Config files | config/providers.ts, config/probe.ts |
| 4 | Adapter interface + base | lib/providers/types.ts, base-http.ts |
| 5 | Adapters batch 1 (5) | OpenAI, ElevenLabs, Deepgram, Google, Azure |
| 6 | Adapters batch 2 (5) | Cartesia, Polly, PlayHT, LMNT, Fish |
| 7 | Probe runner + crons | lib/probe-runner.ts, queries (partial), cron routes |
| 8 | DB queries (remaining) + status | lib/db/queries.ts, lib/status.ts |
| 9 | Public API routes | /api/results, history, errors |
| 10 | Layout, nav, hero | components/nav.tsx, layout |
| 11 | Ranking strip | components/ranking-strip.tsx |
| 12 | TTFB chart | components/ttfb-chart.tsx, time-range-picker |
| 13 | Provider sidebar | components/provider-sidebar.tsx |
| 14 | Comparison table | components/comparison-table.tsx |
| 15 | Error list + footer | components/error-list.tsx |
| 16 | DB migration + smoke test | Migration push, manual testing |
| 17 | Security hardening | Validation, CORS, cache headers |
| 18 | Polish + deploy | Skeletons, responsive, metadata, deploy |
