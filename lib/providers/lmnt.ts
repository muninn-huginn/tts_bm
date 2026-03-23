import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const lmntAdapter: TTSProviderAdapter = {
  id: "lmnt",
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

    return measureHttpTTFB("https://api.lmnt.com/v1/ai/speech", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: config.voice || "lily",
        format: "mp3",
      }),
    });
  },
};

registerAdapter(lmntAdapter);
export default lmntAdapter;
