import { measureHttpTTFB } from "./base-http";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter } from "./types";

const azureAdapter: TTSProviderAdapter = {
  id: "azure",
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

    const region = config.region || process.env.AZURE_SPEECH_REGION || "eastus";
    const voiceName = config.voice || "en-US-JennyNeural";
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const ssml = `<speak version='1.0' xml:lang='en-US'>
      <voice name='${voiceName}'>${escapeXml(text)}</voice>
    </speak>`;

    return measureHttpTTFB(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
      },
      body: ssml,
    });
  },
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

registerAdapter(azureAdapter);
export default azureAdapter;
