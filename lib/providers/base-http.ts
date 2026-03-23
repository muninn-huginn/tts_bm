import { probeConfig } from "@/config/probe";
import type { TTSProbeResult } from "./types";

/**
 * Measure TTFB and total time for an HTTP TTS request.
 * Sends the request, reads the first chunk (TTFB), then drains the stream (total time).
 */
export async function measureHttpTTFB(
  url: string,
  options: RequestInit
): Promise<TTSProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    probeConfig.probeTimeoutMs
  );

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      clearTimeout(timeout);
      return {
        ttfbMs: Math.round(performance.now() - startTime),
        totalTimeMs: Math.round(performance.now() - startTime),
        audioDurationMs: null,
        statusCode: response.status,
        errorMessage: errorText.slice(0, 500) || response.statusText,
      };
    }

    if (!response.body) {
      clearTimeout(timeout);
      return {
        ttfbMs: Math.round(performance.now() - startTime),
        totalTimeMs: Math.round(performance.now() - startTime),
        audioDurationMs: null,
        statusCode: response.status,
        errorMessage: null,
      };
    }

    const reader = response.body.getReader();

    // Read first chunk — this is TTFB
    await reader.read();
    const ttfbMs = Math.round(performance.now() - startTime);

    // Drain remaining stream
    let totalBytes = 0;
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        totalBytes += result.value.byteLength;
      }
    }
    const totalTimeMs = Math.round(performance.now() - startTime);

    clearTimeout(timeout);

    return {
      ttfbMs,
      totalTimeMs,
      audioDurationMs: null,
      statusCode: response.status,
      errorMessage: null,
    };
  } catch (error) {
    clearTimeout(timeout);
    const elapsed = Math.round(performance.now() - startTime);
    const isAbort =
      error instanceof DOMException && error.name === "AbortError";

    return {
      ttfbMs: elapsed,
      totalTimeMs: elapsed,
      audioDurationMs: null,
      statusCode: 0,
      errorMessage: isAbort
        ? `Timeout after ${probeConfig.probeTimeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
}
