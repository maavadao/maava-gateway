import type { ErrorShape } from "./protocol/index.ts";

export type DedupeEntry = {
  ts: number;
  ok: boolean;
  payload?: unknown;
  error?: ErrorShape;
};
