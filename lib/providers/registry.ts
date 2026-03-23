import type { TTSProviderAdapter } from "./types";

const adapters = new Map<string, TTSProviderAdapter>();

export function registerAdapter(adapter: TTSProviderAdapter) {
  adapters.set(adapter.id, adapter);
}

export function getAdapter(id: string): TTSProviderAdapter | undefined {
  return adapters.get(id);
}

export function getAllAdapterIds(): string[] {
  return Array.from(adapters.keys());
}
