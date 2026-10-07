import type { MediaUnderstandingProvider } from "../../types.ts";
import { transcribeDeepgramAudio } from "./audio.ts";

export const deepgramProvider: MediaUnderstandingProvider = {
  id: "deepgram",
  capabilities: ["audio"],
  transcribeAudio: transcribeDeepgramAudio,
};
