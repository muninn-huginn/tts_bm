import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const mistralAdapter: TTSProviderAdapter = {
  id: "mistral",
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

    // Use streaming + PCM for lowest TTFB (~0.7s vs ~2s for mp3 per Mistral docs)
    return measureHttpTTFB("https://api.mistral.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model || "voxtral-mini-tts-2603",
        input: text,
        voice_id: config.voiceId,
        response_format: "pcm",
        stream: true,
      }),
    });
  },
};

registerAdapter(mistralAdapter);
export default mistralAdapter;
