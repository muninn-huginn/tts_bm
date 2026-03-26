// Import all adapters — each registers itself in the registry on import.
import "./openai";
import "./elevenlabs";
import "./deepgram";
import "./google";
import "./azure";
import "./cartesia";
import "./polly";
import "./playht";
import "./lmnt";
import "./fish";
import "./mistral";
import "./smallest";

export { getAdapter, getAllAdapterIds } from "./registry";
