/**
 * Generic OpenClaw gateway RPC bridge route.
 *
 * Lets external services (notably Mission Control) invoke ANY gateway
 * RPC method by name without us having to maintain a one-to-one Express
 * route mapping. The body is forwarded straight into the gateway handler.
 *
 *   POST /api/v1/rpc/:method
 *   body: { params?: Record<string, unknown> }
 *   resp: { success, data, ... } via sendSuccess/sendError
 *
 * Auth: relies on the global cloudAuthMiddleware (JWT) when CLOUD_MODE is on.
 */
import { Router, type Request, type Response } from "express";
import { callGatewayMethod } from "../bridge.ts";
import { sendError, sendSuccess } from "../middleware/response.ts";
import { getGatewayContext } from "./_handler.ts";

const router = Router();

router.post("/rpc/:method", async (req: Request, res: Response): Promise<void> => {
    const method = String(req.params.method || "").trim();
    if (!method) {
        sendError(res, 400, "Missing RPC method name");
        return;
    }

    // Accept both `{ params: { ... } }` and a raw params object body.
    const body = (req.body ?? {}) as Record<string, unknown>;
    const params =
        body && typeof body === "object" && "params" in body && typeof body.params === "object"
            ? (body.params as Record<string, unknown>)
            : body;

    try {
        const ctx = getGatewayContext();
        const result = await callGatewayMethod(method, params, ctx);
        if (result.ok) {
            sendSuccess(res, result.data);
            return;
        }
        sendError(res, 500, `RPC method '${method}' failed`, result.error);
    } catch (err) {
        sendError(
            res,
            500,
            "Internal server error",
            err instanceof Error ? err.message : String(err),
        );
    }
});

export { router as openclawRpcRoutes };
