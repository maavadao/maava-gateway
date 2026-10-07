/**
 * Route helper — creates a standard POST handler that delegates to a gateway RPC method.
 *
 * This eliminates boilerplate across all route files.
 */
import { Router, type Request, type Response } from "express";
import { callGatewayMethod, type BridgeResult } from "../bridge.ts";
import { sendSuccess, sendError } from "../middleware/response.ts";
import type { GatewayRequestContext } from "../../gateway/server-methods/types.ts";

/**
 * Must be set once during REST server startup so every route can access
 * the gateway's runtime context. This avoids prop-drilling through Express.
 */
let _gatewayContext: GatewayRequestContext | null = null;

export function setGatewayContext(ctx: GatewayRequestContext): void {
    _gatewayContext = ctx;
}

export function getGatewayContext(): GatewayRequestContext {
    if (!_gatewayContext) {
        throw new Error("Gateway context not initialised — call setGatewayContext() first");
    }
    return _gatewayContext;
}

/**
 * Creates a standard POST route handler that:
 *  1. Extracts params from req.body
 *  2. Calls the named gateway RPC method via the bridge
 *  3. Sends a standardised JSON response
 */
export function rpcHandler(method: string) {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const params = (req.body ?? {}) as Record<string, unknown>;
            const ctx = getGatewayContext();
            const result: BridgeResult = await callGatewayMethod(method, params, ctx);

            if (result.ok) {
                sendSuccess(res, result.data);
            } else {
                sendError(res, 500, `RPC method '${method}' failed`, result.error);
            }
        } catch (err) {
            sendError(
                res,
                500,
                "Internal server error",
                err instanceof Error ? err.message : String(err),
            );
        }
    };
}
