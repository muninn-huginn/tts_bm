import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const smallestAdapter: TTSProviderAdapter = {
  id: "smallest",
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

    const model = config.model || "lightning-v3.1";
    // Use SSE streaming endpoint for lowest TTFB
    const url = `https://api.smallest.ai/waves/v1/${model}/stream`;

    return measureHttpTTFB(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_id: config.voiceId || "magnus",
        sample_rate: 24000,
        speed: 1.0,
      }),
    });
  },
};

registerAdapter(smallestAdapter);
export default smallestAdapter;
