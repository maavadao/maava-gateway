import type { MediaUnderstandingProvider } from "../../types.ts";
import { describeImageWithModel } from "../image.ts";

export const minimaxProvider: MediaUnderstandingProvider = {
  id: "minimax",
  capabilities: ["image"],
  describeImage: describeImageWithModel,
};
