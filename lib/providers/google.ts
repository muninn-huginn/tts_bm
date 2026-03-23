import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const googleAdapter: TTSProviderAdapter = {
  id: "google",
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

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    return measureHttpTTFB(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: "en-US",
          name: config.voice || "en-US-Neural2-D",
        },
        audioConfig: {
          audioEncoding: "MP3",
        },
      }),
    });
  },
};

registerAdapter(googleAdapter);
export default googleAdapter;
