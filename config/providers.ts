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
    id: "cartesia",
    name: "Cartesia",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "cartesia",
    config: {
      apiKeyEnv: "CARTESIA_API_KEY",
      model: "sonic-2",
      voice: "a0e99841-438c-4a64-b679-ae501e7d6091",
    },
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "elevenlabs",
    config: {
      apiKeyEnv: "ELEVENLABS_API_KEY",
      model: "eleven_flash_v2_5",
      voiceId: "21m00Tcm4TlvDq8ikWAM",
    },
  },
  {
    id: "openai",
    name: "OpenAI",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "openai",
    config: {
      apiKeyEnv: "OPENAI_API_KEY",
      model: "tts-1",
      voice: "alloy",
    },
  },
  {
    id: "google",
    name: "Google Cloud TTS",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "google",
    config: {
      apiKeyEnv: "GOOGLE_TTS_API_KEY",
      voice: "en-US-Neural2-D",
    },
  },
  {
    id: "polly",
    name: "Amazon Polly",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "polly",
    config: {
      apiKeyEnv: "AWS_ACCESS_KEY_ID",
      region: "us-east-1",
      voice: "Matthew",
    },
  },
  {
    id: "azure",
    name: "Azure Speech",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "azure",
    config: {
      apiKeyEnv: "AZURE_SPEECH_KEY",
      region: "eastus",
      voice: "en-US-JennyNeural",
    },
  },
  {
    id: "deepgram",
    name: "Deepgram",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "deepgram",
    config: {
      apiKeyEnv: "DEEPGRAM_API_KEY",
      model: "aura-asteria-en",
    },
  },
  {
    id: "playht",
    name: "PlayHT",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "playht",
    config: {
      apiKeyEnv: "PLAYHT_API_KEY",
      userId: "PLAYHT_USER_ID",
      voice: "s3://voice-cloning-zero-shot/775ae416-49bb-4fb6-bd45-740f205d3789/original/manifest.json",
    },
  },
  {
    id: "lmnt",
    name: "LMNT",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "lmnt",
    config: {
      apiKeyEnv: "LMNT_API_KEY",
      voice: "lily",
    },
  },
  {
    id: "fish",
    name: "Fish Audio",
    enabled: true,
    probeIntervalSeconds: 300,
    adapter: "fish",
    config: {
      apiKeyEnv: "FISH_API_KEY",
      referenceId: "default",
    },
  },
];
