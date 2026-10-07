import type { MediaUnderstandingProvider } from "../../types.ts";
import { describeImageWithModel } from "../image.ts";
import { transcribeOpenAiCompatibleAudio } from "./audio.ts";

export const openaiProvider: MediaUnderstandingProvider = {
  id: "openai",
  capabilities: ["image"],
  describeImage: describeImageWithModel,
  transcribeAudio: transcribeOpenAiCompatibleAudio,
};
