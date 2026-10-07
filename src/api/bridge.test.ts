import { describe, expect, test, vi } from "vitest";
import { callGatewayMethod, type BridgeResult } from "./bridge.js";
import type {
    GatewayRequestContext,
    GatewayRequestHandlerOptions,
    GatewayRequestHandlers,
} from "../gateway/server-methods/types.js";

// Minimal mock context — we only need it to be passed through, not functional
const mockContext = {} as GatewayRequestContext;

describe("bridge – callGatewayMethod", () => {
    test("returns INVALID_REQUEST for unknown method", async () => {
        const result = await callGatewayMethod("nonexistent.method", {}, mockContext);
        expect(result.ok).toBe(false);
        expect(result.error).toEqual({
            code: "INVALID_REQUEST",
            message: "Unknown method: nonexistent.method",
        });
    });

    test("calls sync handler and captures respond(true, …)", async () => {
        const extraHandlers: GatewayRequestHandlers = {
            "test.sync": (opts: GatewayRequestHandlerOptions) => {
                opts.respond(true, { greeting: "hello" });
            },
        };
        const result = await callGatewayMethod("test.sync", { a: 1 }, mockContext, extraHandlers);
        expect(result.ok).toBe(true);
        expect(result.data).toEqual({ greeting: "hello" });
        expect(result.error).toBeUndefined();
    });

    test("calls sync handler and captures respond(false, …, error)", async () => {
        const extraHandlers: GatewayRequestHandlers = {
            "test.fail": (opts: GatewayRequestHandlerOptions) => {
                opts.respond(false, undefined, { code: "BAD", message: "nope" });
            },
        };
        const result = await callGatewayMethod("test.fail", {}, mockContext, extraHandlers);
        expect(result.ok).toBe(false);
        expect(result.error).toEqual({ code: "BAD", message: "nope" });
    });

    test("calls async handler and captures respond() result", async () => {
        const extraHandlers: GatewayRequestHandlers = {
            "test.async": async (opts: GatewayRequestHandlerOptions) => {
                await new Promise((r) => setTimeout(r, 10));
                opts.respond(true, { async: true });
            },
        };
        const result = await callGatewayMethod("test.async", { x: "y" }, mockContext, extraHandlers);
        expect(result.ok).toBe(true);
        expect(result.data).toEqual({ async: true });
    });

    test("catches async handler rejection as INTERNAL_ERROR", async () => {
        const extraHandlers: GatewayRequestHandlers = {
            "test.throw": async () => {
                throw new Error("kaboom");
            },
        };
        const result = await callGatewayMethod("test.throw", {}, mockContext, extraHandlers);
        expect(result.ok).toBe(false);
        expect(result.error).toEqual({
            code: "INTERNAL_ERROR",
            message: "kaboom",
        });
    });

    test("captures meta from respond()", async () => {
        const extraHandlers: GatewayRequestHandlers = {
            "test.meta": (opts: GatewayRequestHandlerOptions) => {
                opts.respond(true, { val: 1 }, undefined, { timing: 42 });
            },
        };
        const result = await callGatewayMethod("test.meta", {}, mockContext, extraHandlers);
        expect(result.ok).toBe(true);
        expect(result.meta).toEqual({ timing: 42 });
    });

    test("passes params through to handler's req.params", async () => {
        let receivedParams: unknown;
        const extraHandlers: GatewayRequestHandlers = {
            "test.params": (opts: GatewayRequestHandlerOptions) => {
                receivedParams = opts.params;
                opts.respond(true);
            },
        };
        const params = { foo: "bar", count: 42 };
        await callGatewayMethod("test.params", params, mockContext, extraHandlers);
        expect(receivedParams).toEqual(params);
    });

    test("passes context through to handler", async () => {
        let receivedContext: unknown;
        const extraHandlers: GatewayRequestHandlers = {
            "test.ctx": (opts: GatewayRequestHandlerOptions) => {
                receivedContext = opts.context;
                opts.respond(true);
            },
        };
        await callGatewayMethod("test.ctx", {}, mockContext, extraHandlers);
        expect(receivedContext).toBe(mockContext);
    });

    test("sets client to null for REST calls", async () => {
        let receivedClient: unknown = "not-set";
        const extraHandlers: GatewayRequestHandlers = {
            "test.client": (opts: GatewayRequestHandlerOptions) => {
                receivedClient = opts.client;
                opts.respond(true);
            },
        };
        await callGatewayMethod("test.client", {}, mockContext, extraHandlers);
        expect(receivedClient).toBeNull();
    });

    test("builds correct RequestFrame shape", async () => {
        let receivedReq: unknown;
        const extraHandlers: GatewayRequestHandlers = {
            "test.frame": (opts: GatewayRequestHandlerOptions) => {
                receivedReq = opts.req;
                opts.respond(true);
            },
        };
        await callGatewayMethod("test.frame", { key: "val" }, mockContext, extraHandlers);
        const req = receivedReq as Record<string, unknown>;
        expect(req.type).toBe("req");
        expect(typeof req.id).toBe("string");
        expect((req.id as string).length).toBeGreaterThan(0);
        expect(req.method).toBe("test.frame");
        expect(req.params).toEqual({ key: "val" });
    });
});
