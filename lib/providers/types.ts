export interface TTSProbeResult {
  ttfbMs: number;
  totalTimeMs: number;
  audioDurationMs: number | null;
  statusCode: number;
  errorMessage: string | null;
}

export interface TTSProviderAdapter {
  id: string;
  probe(text: string, config: Record<string, string | undefined>): Promise<TTSProbeResult>;
}
