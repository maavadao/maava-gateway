/**
 * OpenClaw REST API Server
 *
 * Wraps the existing gateway WebSocket RPC handlers with a standard
 * HTTP/JSON interface using Express.
 *
 * Startup: called from gateway server.impl.ts after the gateway context
 * is fully initialised. Listens on a separate port (default 3000).
 */
import express from "express";
import type { Server } from "node:http";
import type { GatewayRequestContext } from "../gateway/server-methods/types.ts";
import { tenantMiddleware } from "./middleware/tenant.ts";
import { cloudAuthMiddleware } from "./middleware/cloud-auth.ts";
import { rateLimit } from "./middleware/rate-limit.ts";
import { sendError } from "./middleware/response.ts";
import { setGatewayContext } from "./routes/_handler.ts";
import { userDb } from "./db/user-db.ts";

const CLOUD_MODE = process.env.OPENCLAW_CLOUD_MODE === "true";
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "https://*.barrsa.com";
import {
    healthRoutes,
    authRoutes,
    configRoutes,
    agentRoutes,
    channelRoutes,
    sessionRoutes,
    modelRoutes,
    messageRoutes,
    cronRoutes,
    skillRoutes,
    nodeRoutes,
    deviceRoutes,
    ttsRoutes,
    wizardRoutes,
    chatRoutes,
    logRoutes,
    miscRoutes,
    dataRoutes,
    openclawRpcRoutes,
} from "./routes/index.ts";

export interface RestServerOptions {
    /** Port to listen on — default: 3000: */
    port?: number;
    /** Gateway context (runtime state) from the main gateway server */
    context: GatewayRequestContext;
}

export function createRestApp(context: GatewayRequestContext): express.Application {
    // Share the gateway context with all route handlers
    setGatewayContext(context);

    // Initialize user database
    userDb.initialize();

    const app = express();
    app.disable("x-powered-by");

    // Trust Cloud Run / GCP load balancer so req.ip reflects the real client IP
    // (Cloud Run injects it via X-Forwarded-For; without this, req.ip = load balancer IP)
    app.set("trust proxy", true);

    // ── Global middleware ──────────────────────────────────────────
    app.use(express.json({ limit: "10mb" }));

    // Security headers
    app.use((_req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-DNS-Prefetch-Control", "off");
        res.setHeader("X-Download-Options", "noopen");
        res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        if (CLOUD_MODE) {
            res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
        }
        // Remove Express server fingerprint
        res.removeHeader("X-Powered-By");
        next();
    });

    // CORS — restrict to *.barrsa.com + Cloud Run origins in cloud mode; wide open in dev
    const EXTRA_ORIGINS = (process.env.CORS_ORIGIN || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    app.use((_req, res, next) => {
        const origin = _req.headers.origin || "";
        if (CLOUD_MODE) {
            const isBarrsa = /^https?:\/\/([a-z0-9-]+\.)?barrsa\.com(:\d+)?$/.test(origin);
            const isCloudRun = /^https?:\/\/[a-z0-9-]+\.europe-west1\.run\.app$/.test(origin);
            const isExtra = EXTRA_ORIGINS.includes(origin.toLowerCase());
            if (isBarrsa || isCloudRun || isExtra) {
                res.setHeader("Access-Control-Allow-Origin", origin);
            }
        } else {
            res.setHeader("Access-Control-Allow-Origin", "*");
        }
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-ID");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        if (_req.method === "OPTIONS") {
            res.status(204).end();
            return;
        }
        next();
    });

    app.use(tenantMiddleware);

    // Lightweight health probe — used by Cloud Run/load balancers AND by
    // Mission Control's REST-bridge gateway compatibility check.
    app.get("/healthz", (_req, res) => {
        res.json({
            ok: true,
            service: "tenant-platform",
            mode: CLOUD_MODE ? "cloud" : "local",
            integration: "openclaw_rest_bridge",
        });
    });

    // Cloud mode: require JWT auth on all non-health endpoints
    if (CLOUD_MODE) {
        app.use(cloudAuthMiddleware);
        // Global rate limit: 200 requests per minute per authenticated user
        // Falls back to real client IP (available via trust proxy) for unauthenticated paths
        app.use(rateLimit({
            max: 200,
            windowSec: 60,
            keyFn: (req) => req.cloudUser?.userId || req.ip || "unknown",
        }));
    }

    // ── Root information endpoint ──────────────────────────────────
    app.get("/api/v1", (_req, res) => {
        res.json({
            name: "OpenClaw REST API",
            version: "1.0.0",
            docs: "POST to /api/v1/{resource}/{action} with JSON body",
        });
    });

    // ── Mount all route modules under /api/v1 ──────────────────────
    const v1 = express.Router();

    v1.use(healthRoutes);
    v1.use(authRoutes);
    v1.use(configRoutes);
    v1.use(agentRoutes);
    v1.use(channelRoutes);
    v1.use(sessionRoutes);
    v1.use(modelRoutes);
    v1.use(messageRoutes);
    v1.use(cronRoutes);
    v1.use(skillRoutes);
    v1.use(nodeRoutes);
    v1.use(deviceRoutes);
    v1.use(ttsRoutes);
    v1.use(wizardRoutes);
    v1.use(chatRoutes);
    v1.use(logRoutes);
    v1.use(miscRoutes);
    v1.use(dataRoutes);
    v1.use(openclawRpcRoutes);

    app.use("/api/v1", v1);

    // ── 404 handler ────────────────────────────────────────────────
    app.use((_req, res) => {
        sendError(res, 404, `Not found: ${_req.method} ${_req.path}`);
    });

    // ── Global error handler ───────────────────────────────────────
    app.use(
        (
            err: unknown,
            _req: express.Request,
            res: express.Response,
            _next: express.NextFunction,
        ) => {
            const message = err instanceof Error ? err.message : "Unknown error";
            sendError(res, 500, message);
        },
    );

    return app;
}

/**
 * Start the REST API server and return the HTTP server instance
 * so the caller can close it during graceful shutdown.
 */
export function startRestServer(opts: RestServerOptions): Promise<Server> {
    const port = opts.port ?? (Number(process.env.OPENCLAW_REST_PORT) || 3000);
    const app = createRestApp(opts.context);

    return new Promise<Server>((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`[REST API] Listening on http://0.0.0.0:${port}/api/v1`);
            resolve(server);
        });
        server.on("error", reject);
    });
}
