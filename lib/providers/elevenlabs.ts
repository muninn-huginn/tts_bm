import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const elevenlabsAdapter: TTSProviderAdapter = {
  id: "elevenlabs",
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

    const voiceId = config.voiceId || "21m00Tcm4TlvDq8ikWAM";
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;

    return measureHttpTTFB(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: config.model || "eleven_flash_v2_5",
      }),
    });
  },
};

registerAdapter(elevenlabsAdapter);
export default elevenlabsAdapter;
