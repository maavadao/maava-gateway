import type { MediaUnderstandingProvider } from "../../types.ts";
import { describeImageWithModel } from "../image.ts";

export const anthropicProvider: MediaUnderstandingProvider = {
  id: "anthropic",
  capabilities: ["image"],
  describeImage: describeImageWithModel,
};
