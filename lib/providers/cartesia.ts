import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const cartesiaAdapter: TTSProviderAdapter = {
  id: "cartesia",
  async probe(text, config) {
    const apiKey = process.env[config.apiKeyEnv!];
    if (!apiKey) {
      return {
        ttfbMs: 0,
        totalTimeMs: 0,
        audioDurationMs: null,
        statusCode: 0,
        errorMessage: `Missing env var: ${config.apiKeyEnv}`,
      };
    }

    // Use SSE streaming endpoint for lowest TTFB (not /tts/bytes which waits for full audio)
    // Use raw PCM format to avoid encoding overhead on first chunk
    return measureHttpTTFB("https://api.cartesia.ai/tts/sse", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Cartesia-Version": "2025-04-16",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: config.model || "sonic-2",
        transcript: text,
        voice: {
          mode: "id",
          id: config.voice || "a0e99841-438c-4a64-b679-ae501e7d6091",
        },
        output_format: {
          container: "raw",
          encoding: "pcm_s16le",
          sample_rate: 24000,
        },
      }),
    });
  },
};

registerAdapter(cartesiaAdapter);
export default cartesiaAdapter;
