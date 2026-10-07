import { describe, expect, test, vi } from "vitest";
import { sendSuccess, sendError } from "./response.js";
import type { Response } from "express";

function makeMockRes(): Response & { _status: number; _body: unknown } {
    const res = {
        _status: 0,
        _body: undefined,
        status(code: number) {
            res._status = code;
            return res;
        },
        json(body: unknown) {
            res._body = body;
            return res;
        },
    };
    return res as unknown as Response & { _status: number; _body: unknown };
}

describe("sendSuccess", () => {
    test("returns 200 with standard envelope", () => {
        const res = makeMockRes();
        sendSuccess(res, { foo: "bar" });
        expect(res._status).toBe(200);
        expect(res._body).toEqual({
            success: true,
            data: { foo: "bar" },
            message: "OK",
        });
    });

    test("accepts custom message", () => {
        const res = makeMockRes();
        sendSuccess(res, 42, "Created");
        expect(res._body).toEqual({
            success: true,
            data: 42,
            message: "Created",
        });
    });

    test("works with null data", () => {
        const res = makeMockRes();
        sendSuccess(res, null);
        expect(res._body).toEqual({
            success: true,
            data: null,
            message: "OK",
        });
    });
});

describe("sendError", () => {
    test("returns status code with error envelope", () => {
        const res = makeMockRes();
        sendError(res, 404, "Not found");
        expect(res._status).toBe(404);
        expect(res._body).toEqual({
            success: false,
            data: null,
            message: "Not found",
            error: undefined,
        });
    });

    test("includes error detail when provided", () => {
        const res = makeMockRes();
        sendError(res, 500, "Server error", { code: "BANG" });
        expect(res._status).toBe(500);
        expect(res._body).toEqual({
            success: false,
            data: null,
            message: "Server error",
            error: { code: "BANG" },
        });
    });

    test("works with 400 status", () => {
        const res = makeMockRes();
        sendError(res, 400, "Bad request");
        expect(res._status).toBe(400);
        expect((res._body as { success: boolean }).success).toBe(false);
    });
});
