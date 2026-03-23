import {
  PollyClient,
  SynthesizeSpeechCommand,
} from "@aws-sdk/client-polly";
import { registerAdapter } from "./registry";
import type { TTSProviderAdapter, TTSProbeResult } from "./types";
import { probeConfig } from "@/config/probe";

const pollyAdapter: TTSProviderAdapter = {
  id: "polly",
  async probe(text, config): Promise<TTSProbeResult> {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      return {
        ttfbMs: 0,
        totalTimeMs: 0,
        audioDurationMs: null,
        statusCode: 0,
        errorMessage: "Missing AWS credentials",
      };
    }

    const client = new PollyClient({
      region: config.region || process.env.AWS_REGION || "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
    });

    const startTime = performance.now();

    try {
      const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: "mp3",
        VoiceId: (config.voice || "Matthew") as import("@aws-sdk/client-polly").VoiceId,
        Engine: "neural",
      });

      const result = await client.send(command);

      const ttfbMs = Math.round(performance.now() - startTime);

      // Drain the stream
      if (result.AudioStream) {
        const chunks: Uint8Array[] = [];
        const stream = result.AudioStream as AsyncIterable<Uint8Array>;
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      }

      const totalTimeMs = Math.round(performance.now() - startTime);

      return {
        ttfbMs,
        totalTimeMs,
        audioDurationMs: null,
        statusCode: 200,
        errorMessage: null,
      };
    } catch (error) {
      const elapsed = Math.round(performance.now() - startTime);
      return {
        ttfbMs: elapsed,
        totalTimeMs: elapsed,
        audioDurationMs: null,
        statusCode: (error as { $metadata?: { httpStatusCode?: number } })
          .$metadata?.httpStatusCode || 0,
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

registerAdapter(pollyAdapter);
export default pollyAdapter;
