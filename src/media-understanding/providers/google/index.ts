import type { MediaUnderstandingProvider } from "../../types.ts";
import { describeImageWithModel } from "../image.ts";
import { transcribeGeminiAudio } from "./audio.ts";
import { describeGeminiVideo } from "./video.ts";

export const googleProvider: MediaUnderstandingProvider = {
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: describeImageWithModel,
  transcribeAudio: transcribeGeminiAudio,
  describeVideo: describeGeminiVideo,
};
