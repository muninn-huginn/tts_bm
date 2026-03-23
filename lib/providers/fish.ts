import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const fishAdapter: TTSProviderAdapter = {
  id: "fish",
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

    return measureHttpTTFB("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reference_id: config.referenceId || "default",
        ...(config.model && { model: config.model }),
      }),
    });
  },
};

registerAdapter(fishAdapter);
export default fishAdapter;
