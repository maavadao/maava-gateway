import type { GatewayRequestHandlers } from "./types.ts";
import { ErrorCodes, errorShape } from "../protocol/index.ts";

export const connectHandlers: GatewayRequestHandlers = {
  connect: ({ respond }) => {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, "connect is only valid as the first request"),
    );
  },
};
