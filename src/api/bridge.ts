/**
 * RPC Bridge — translates HTTP POST requests into the same format that
 * existing gateway WebSocket RPC handlers expect.
 *
 * Instead of duplicating business logic, we create a shim `respond` callback
 * that captures the handler's result and returns it as a Promise.
 */
import { randomUUID } from "node:crypto";
import type {
  GatewayRequestContext,
  GatewayRequestHandlerOptions,
  GatewayRequestHandlers,
  RespondFn,
} from "../gateway/server-methods/types.ts";
import type { RequestFrame } from "../gateway/protocol/schema/types.ts";
import { coreGatewayHandlers } from "../gateway/server-methods.ts";

export type BridgeResult = {
  ok: boolean;
  data: unknown;
  error?: unknown;
  meta?: Record<string, unknown>;
};

/**
 * Call an existing gateway WebSocket RPC method handler directly, capturing
 * its `respond()` callback output as a normal Promise return value.
 */
export async function callGatewayMethod(
  method: string,
  params: Record<string, unknown>,
  context: GatewayRequestContext,
  extraHandlers?: GatewayRequestHandlers,
): Promise<BridgeResult> {
  const handler = extraHandlers?.[method] ?? coreGatewayHandlers[method];
  if (!handler) {
    return {
      ok: false,
      data: undefined,
      error: { code: "INVALID_REQUEST", message: `Unknown method: ${method}` },
    };
  }

  // Build a fake RequestFrame that mimics what the WebSocket layer sends
  const req: RequestFrame = {
    type: "req",
    id: randomUUID(),
    method,
    params,
  };

  return new Promise<BridgeResult>((resolve) => {
    const respond: RespondFn = (ok, payload, error, meta) => {
      resolve({ ok, data: payload, error, meta });
    };

    const handlerOpts: GatewayRequestHandlerOptions = {
      req,
      params,
      client: null, // REST calls don't have a WebSocket client
      isWebchatConnect: () => false,
      respond,
      context,
    };

    // Handler may be sync or async — handle both
    const result = handler(handlerOpts);
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch((err: unknown) => {
        resolve({
          ok: false,
          data: undefined,
          error: {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : String(err),
          },
        });
      });
    }
  });
}
