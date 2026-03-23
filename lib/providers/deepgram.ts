import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const deepgramAdapter: TTSProviderAdapter = {
  id: "deepgram",
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

    const model = config.model || "aura-asteria-en";
    const url = `https://api.deepgram.com/v1/speak?model=${model}`;

    return measureHttpTTFB(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
  },
};

registerAdapter(deepgramAdapter);
export default deepgramAdapter;
