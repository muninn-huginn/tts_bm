export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  probeIntervalSeconds: number;
  adapter: string;
  config: {
    apiKeyEnv: string;
    model?: string;
    voice?: string;
    voiceId?: string;
    endpoint?: string;
    region?: string;
    userId?: string;
    referenceId?: string;
    [key: string]: string | undefined;
  };
}

export const providers: ProviderConfig[] = [
  {
    id: "cartesia-sonic3",
    name: "Cartesia Sonic 3",
    enabled: true,
    probeIntervalSeconds: 60,
    adapter: "cartesia",
    config: {
      apiKeyEnv: "CARTESIA_API_KEY",
      model: "sonic-3",
      voice: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    },
  },
  {
    id: "cartesia-turbo",
    name: "Cartesia Sonic Turbo",
    enabled: true,
    probeIntervalSeconds: 60,
    adapter: "cartesia",
    config: {
      apiKeyEnv: "CARTESIA_API_KEY",
      model: "sonic-turbo",
      voice: "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    },
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    enabled: true,
    probeIntervalSeconds: 60,
    adapter: "elevenlabs",
    config: {
      apiKeyEnv: "ELEVENLABS_API_KEY",
      model: "eleven_flash_v2_5",
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
    },
  },
  {
    id: "deepgram",
    name: "Deepgram",
    enabled: true,
    probeIntervalSeconds: 60,
    adapter: "deepgram",
    config: {
      apiKeyEnv: "DEEPGRAM_API_KEY",
      model: "aura-2-thalia-en",
    },
  },
  {
    id: "fish",
    name: "Fish Audio",
    enabled: true,
    probeIntervalSeconds: 60,
    adapter: "fish",
    config: {
      apiKeyEnv: "FISH_API_KEY",
      model: "s2-pro",
      referenceId: "7f92f8afb8ec43bf81429cc1c9199cb1",
    },
  },
  {
    id: "mistral",
    name: "Mistral Voxtral",
    enabled: true,
    probeIntervalSeconds: 60,
    adapter: "mistral",
    config: {
      apiKeyEnv: "MISTRAL_API_KEY",
      model: "voxtral-mini-tts-2603",
      voiceId: "e3596645-b1af-469e-b857-f18ddedc7652", // Oliver - Neutral (en_gb)
    },
  },
];
