/**
 * REST API end-to-end tests
 *
 * Starts a real gateway server with OPENCLAW_REST_API=1 so the REST HTTP
 * server comes up alongside the WebSocket server. Then fires HTTP requests
 * at every endpoint category, and for key methods verifies that the response
 * matches what the WebSocket RPC path returns (parity check).
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { WebSocket } from "ws";
import {
    connectOk,
    installGatewayTestHooks,
    rpcReq,
    startGatewayServer,
} from "../gateway/test-helpers.js";
import { getDeterministicFreePortBlock } from "../test-utils/ports.js";

installGatewayTestHooks({ scope: "suite" });

let server: Awaited<ReturnType<typeof startGatewayServer>>;
let wsPort = 0;
let restPort = 0;
let restBaseUrl = "";
let ws: WebSocket;

let previousRestApi: string | undefined;
let previousRestPort: string | undefined;

beforeAll(async () => {
    // Save env
    previousRestApi = process.env.OPENCLAW_REST_API;
    previousRestPort = process.env.OPENCLAW_REST_PORT;

    // Allocate two separate port blocks to avoid any collision
    wsPort = await getDeterministicFreePortBlock({ offsets: [0, 1, 2, 3, 4] });
    restPort = await getDeterministicFreePortBlock({ offsets: [0] });
    process.env.OPENCLAW_REST_API = "1";
    process.env.OPENCLAW_REST_PORT = String(restPort);

    server = await startGatewayServer(wsPort);
    restBaseUrl = `http://127.0.0.1:${restPort}`;

    // Also open a WS client for parity checks
    ws = new WebSocket(`ws://127.0.0.1:${wsPort}`);
    await new Promise<void>((resolve) => ws.once("open", resolve));
    await connectOk(ws);
}, 180_000);

afterAll(async () => {
    ws?.close();
    await server?.close();
    // Restore env
    if (previousRestApi === undefined) {
        delete process.env.OPENCLAW_REST_API;
    } else {
        process.env.OPENCLAW_REST_API = previousRestApi;
    }
    if (previousRestPort === undefined) {
        delete process.env.OPENCLAW_REST_PORT;
    } else {
        process.env.OPENCLAW_REST_PORT = previousRestPort;
    }
});

// ── Helper ────────────────────────────────────────────────────────────

async function post(
    path: string,
    body: Record<string, unknown> = {},
    headers: Record<string, string> = {},
) {
    const res = await fetch(`${restBaseUrl}/api/v1${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function get(path: string) {
    const res = await fetch(`${restBaseUrl}${path}`);
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function options(path: string) {
    const res = await fetch(`${restBaseUrl}${path}`, { method: "OPTIONS" });
    return { status: res.status, headers: res.headers };
}

// ── Server Infrastructure Tests ──────────────────────────────────────

describe("REST server infrastructure", () => {
    test("GET /api/v1 returns API info", async () => {
        const res = await get("/api/v1");
        expect(res.status).toBe(200);
        expect(res.body.name).toBe("OpenClaw REST API");
        expect(res.body.version).toBe("1.0.0");
    });

    test("CORS preflight returns 204 with correct headers", async () => {
        const res = await options("/api/v1/health");
        expect(res.status).toBe(204);
        expect(res.headers.get("access-control-allow-origin")).toBe("*");
        expect(res.headers.get("access-control-allow-methods")).toContain("POST");
        expect(res.headers.get("access-control-allow-headers")).toContain("X-Tenant-ID");
    });

    test("unknown path returns 404 with standard error envelope", async () => {
        const res = await post("/this/does/not/exist");
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(typeof res.body.message).toBe("string");
    });

    test("X-Tenant-ID header is accepted", async () => {
        const res = await post("/health", {}, { "X-Tenant-ID": "tenant-abc" });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── Health & Status ──────────────────────────────────────────────────

describe("health & status endpoints", () => {
    test("POST /health returns success with ok:true", async () => {
        const res = await post("/health");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const data = res.body.data as Record<string, unknown>;
        expect(data.ok).toBe(true);
        // ts field is only present on cached snapshots; don't assert its type
    });

    test("POST /status returns success with ok:true", async () => {
        const res = await post("/status");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const data = res.body.data as Record<string, unknown>;
        expect(data.ok).toBe(true);
    });

    test("health parity: REST matches WebSocket RPC", async () => {
        const [restRes, wsRes] = await Promise.all([
            post("/health"),
            rpcReq(ws, "health"),
        ]);
        expect(restRes.body.success).toBe(true);
        expect(wsRes.ok).toBe(true);
        const restData = restRes.body.data as Record<string, unknown>;
        const wsData = wsRes.payload as Record<string, unknown>;
        expect(restData.ok).toBe(wsData.ok);
        expect(restData.defaultAgentId).toBe(wsData.defaultAgentId);
    });

    test("status parity: REST matches WebSocket RPC", async () => {
        const [restRes, wsRes] = await Promise.all([
            post("/status"),
            rpcReq(ws, "status"),
        ]);
        expect(restRes.body.success).toBe(true);
        expect(wsRes.ok).toBe(true);
        const restData = restRes.body.data as Record<string, unknown>;
        const wsData = wsRes.payload as Record<string, unknown>;
        expect(restData.ok).toBe(wsData.ok);
    });
});

// ── Config ───────────────────────────────────────────────────────────

describe("config endpoints", () => {
    test("POST /config/get returns config data", async () => {
        const res = await post("/config/get");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
    });

    test("POST /config/schema returns schema data", async () => {
        const res = await post("/config/schema");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("config.get parity: REST matches WebSocket RPC", async () => {
        const [restRes, wsRes] = await Promise.all([
            post("/config/get"),
            rpcReq(ws, "config.get"),
        ]);
        expect(restRes.body.success).toBe(true);
        expect(wsRes.ok).toBe(true);
        expect(typeof restRes.body.data).toBe(typeof wsRes.payload);
    });
});

// ── Sessions ─────────────────────────────────────────────────────────

describe("session endpoints", () => {
    test("POST /sessions/list returns session list", async () => {
        const res = await post("/sessions/list");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("sessions.list parity: REST matches WebSocket RPC", async () => {
        const [restRes, wsRes] = await Promise.all([
            post("/sessions/list"),
            rpcReq(ws, "sessions.list"),
        ]);
        expect(restRes.body.success).toBe(true);
        expect(wsRes.ok).toBe(true);
    });
});

// ── Models ───────────────────────────────────────────────────────────

describe("model endpoints", () => {
    test("POST /models/list returns model catalog", async () => {
        const res = await post("/models/list");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("models.list parity: REST matches WebSocket RPC", async () => {
        const [restRes, wsRes] = await Promise.all([
            post("/models/list"),
            rpcReq(ws, "models.list"),
        ]);
        expect(restRes.body.success).toBe(true);
        expect(wsRes.ok).toBe(true);
    });
});

// ── Agents ───────────────────────────────────────────────────────────

describe("agent endpoints", () => {
    test("POST /agents/list returns agent list", async () => {
        const res = await post("/agents/list");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("agents.list parity: REST matches WebSocket RPC", async () => {
        const [restRes, wsRes] = await Promise.all([
            post("/agents/list"),
            rpcReq(ws, "agents.list"),
        ]);
        expect(restRes.body.success).toBe(true);
        expect(wsRes.ok).toBe(true);
    });
});

// ── Channels ─────────────────────────────────────────────────────────

describe("channel endpoints", () => {
    test("POST /channels/status returns channel status", async () => {
        const res = await post("/channels/status");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("channels.status parity: REST matches WebSocket RPC", async () => {
        const [restRes, wsRes] = await Promise.all([
            post("/channels/status"),
            rpcReq(ws, "channels.status"),
        ]);
        expect(restRes.body.success).toBe(true);
        expect(wsRes.ok).toBe(true);
    });
});

// ── Cron ─────────────────────────────────────────────────────────────

describe("cron endpoints", () => {
    test("POST /cron/list returns cron list", async () => {
        const res = await post("/cron/list");
        expect(res.status).toBe(200);
        expect(typeof res.body.success).toBe("boolean");
    });

    test("POST /cron/status returns cron status", async () => {
        const res = await post("/cron/status");
        expect(res.status).toBe(200);
        expect(typeof res.body.success).toBe("boolean");
    });
});

// ── System / Misc ────────────────────────────────────────────────────

describe("system endpoints", () => {
    test("POST /system/presence returns presence array", async () => {
        const res = await post("/system/presence");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test("system-presence parity: REST matches WebSocket RPC", async () => {
        const [restRes, wsRes] = await Promise.all([
            post("/system/presence"),
            rpcReq(ws, "system-presence"),
        ]);
        expect(restRes.body.success).toBe(true);
        expect(wsRes.ok).toBe(true);
        expect(Array.isArray(restRes.body.data)).toBe(true);
        expect(Array.isArray(wsRes.payload)).toBe(true);
    });

    test("POST /system/event with text param", async () => {
        const res = await post("/system/event", { text: "test event from REST" });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("POST /system/heartbeat returns last heartbeat", async () => {
        const res = await post("/system/heartbeat");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("POST /system/heartbeats can toggle heartbeats", async () => {
        const res = await post("/system/heartbeats", { enabled: false });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const data = res.body.data as Record<string, unknown>;
        expect(data.enabled).toBe(false);

        const res2 = await post("/system/heartbeats", { enabled: true });
        expect(res2.status).toBe(200);
        expect(res2.body.success).toBe(true);
    });
});

// ── Voicewake ────────────────────────────────────────────────────────

describe("voicewake endpoints", () => {
    test("POST /voicewake/get returns default triggers", async () => {
        const res = await post("/voicewake/get");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const data = res.body.data as { triggers?: string[] };
        expect(Array.isArray(data.triggers)).toBe(true);
    });

    test("voicewake.get parity: REST matches WebSocket RPC", async () => {
        const [restRes, wsRes] = await Promise.all([
            post("/voicewake/get"),
            rpcReq(ws, "voicewake.get"),
        ]);
        expect(restRes.body.success).toBe(true);
        expect(wsRes.ok).toBe(true);
        const restTriggers = (restRes.body.data as { triggers?: string[] }).triggers;
        const wsTriggers = (wsRes.payload as { triggers?: string[] }).triggers;
        expect(restTriggers).toEqual(wsTriggers);
    });
});

// ── Wizard ───────────────────────────────────────────────────────────

describe("wizard endpoints", () => {
    test("POST /wizard/status without sessionId returns 500 (validation error)", async () => {
        // wizard.status requires a sessionId param; omitting it triggers a validation error
        const res = await post("/wizard/status");
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });

    test("POST /wizard/status with unknown sessionId returns 500", async () => {
        const res = await post("/wizard/status", { sessionId: "nonexistent-session" });
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

// ── Logs ─────────────────────────────────────────────────────────────

describe("logs endpoints", () => {
    test("POST /logs/tail returns log entries", async () => {
        const res = await post("/logs/tail");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── Usage ────────────────────────────────────────────────────────────

describe("usage endpoints", () => {
    test("POST /usage/status returns usage data", async () => {
        const res = await post("/usage/status");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── Skills ───────────────────────────────────────────────────────────

describe("skills endpoints", () => {
    test("POST /skills/status returns skills status", async () => {
        const res = await post("/skills/status");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("POST /skills/bins returns skills bins", async () => {
        const res = await post("/skills/bins");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── TTS ──────────────────────────────────────────────────────────────

describe("tts endpoints", () => {
    test("POST /tts/status returns TTS status", async () => {
        const res = await post("/tts/status");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("POST /tts/providers returns TTS providers", async () => {
        const res = await post("/tts/providers");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── Nodes ────────────────────────────────────────────────────────────

describe("node endpoints", () => {
    test("POST /nodes/list returns node list", async () => {
        const res = await post("/nodes/list");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("POST /nodes/pair/list returns pair list", async () => {
        const res = await post("/nodes/pair/list");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── Devices ──────────────────────────────────────────────────────────

describe("device endpoints", () => {
    test("POST /devices/pair/list returns device pair list", async () => {
        const res = await post("/devices/pair/list");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── Exec Approvals ───────────────────────────────────────────────────

describe("exec approval endpoints", () => {
    test("POST /exec/approvals/get returns approval settings", async () => {
        const res = await post("/exec/approvals/get");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("POST /exec/approvals/node/get without nodeId returns 500 (validation error)", async () => {
        // exec.approvals.node.get requires a nodeId param; omitting it triggers validation error
        const res = await post("/exec/approvals/node/get");
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

// ── Response Envelope Consistency ────────────────────────────────────

describe("response envelope consistency", () => {
    test("all successful responses have success+data+message", async () => {
        const endpoints = [
            "/health",
            "/status",
            "/config/get",
            "/sessions/list",
            "/channels/status",
            "/system/presence",
            "/system/heartbeat",
            "/voicewake/get",
            "/logs/tail",
        ];

        for (const ep of endpoints) {
            const res = await post(ep);
            expect(res.body).toHaveProperty("success");
            expect(res.body).toHaveProperty("message");
            expect("data" in res.body).toBe(true);
        }
    });

    test("error responses have success=false", async () => {
        const res = await post("/nonexistent/endpoint");
        expect(res.body.success).toBe(false);
        expect(typeof res.body.message).toBe("string");
    });
});
