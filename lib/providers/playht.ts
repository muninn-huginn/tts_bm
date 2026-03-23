import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const playhtAdapter: TTSProviderAdapter = {
  id: "playht",
  async probe(text, config) {
    const apiKey = process.env[config.apiKeyEnv!];
    const userId = process.env[config.userId || "PLAYHT_USER_ID"];
    if (!apiKey || !userId) {
      return {
        ttfbMs: 0,
        totalTimeMs: 0,
        audioDurationMs: null,
        statusCode: 0,
        errorMessage: `Missing env var: ${config.apiKeyEnv} or ${config.userId}`,
      };
    }

    return measureHttpTTFB("https://api.play.ht/api/v2/tts/stream", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-User-Id": userId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: config.voice,
        output_format: "mp3",
        quality: "draft",
      }),
    });
  },
};

registerAdapter(playhtAdapter);
export default playhtAdapter;
