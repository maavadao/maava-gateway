import { describe, expect, test, vi } from "vitest";
import { validateBody } from "./validate.js";
import type { Request, Response, NextFunction } from "express";

function makeMockReq(body: unknown): Request {
    return { body } as Request;
}

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

describe("validateBody", () => {
    test("calls next when all required fields present", () => {
        const mw = validateBody(["name", "value"]);
        const req = makeMockReq({ name: "Alice", value: 123 });
        const res = makeMockRes();
        const next = vi.fn();
        mw(req, res, next);
        expect(next).toHaveBeenCalledOnce();
        expect(res._status).toBe(0); // not called
    });

    test("returns 400 when a required field is missing", () => {
        const mw = validateBody(["name", "value"]);
        const req = makeMockReq({ name: "Alice" });
        const res = makeMockRes();
        const next = vi.fn();
        mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(400);
        expect((res._body as { message: string }).message).toContain("value");
    });

    test("returns 400 when field is present but undefined", () => {
        const mw = validateBody(["name"]);
        const req = makeMockReq({ name: undefined });
        const res = makeMockRes();
        const next = vi.fn();
        mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(400);
    });

    test("returns 400 when body is null", () => {
        const mw = validateBody(["name"]);
        const req = makeMockReq(null);
        const res = makeMockRes();
        const next = vi.fn();
        mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(400);
        expect((res._body as { message: string }).message).toContain("JSON object");
    });

    test("returns 400 when body is not an object", () => {
        const mw = validateBody(["name"]);
        const req = makeMockReq("not an object");
        const res = makeMockRes();
        const next = vi.fn();
        mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(400);
    });

    test("lists all missing fields in error message", () => {
        const mw = validateBody(["a", "b", "c"]);
        const req = makeMockReq({});
        const res = makeMockRes();
        const next = vi.fn();
        mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        const msg = (res._body as { message: string }).message;
        expect(msg).toContain("a");
        expect(msg).toContain("b");
        expect(msg).toContain("c");
    });

    test("passes with empty required fields array", () => {
        const mw = validateBody([]);
        const req = makeMockReq({});
        const res = makeMockRes();
        const next = vi.fn();
        mw(req, res, next);
        expect(next).toHaveBeenCalledOnce();
    });

    test("accepts falsy but defined values (0, false, empty string)", () => {
        const mw = validateBody(["num", "bool", "str"]);
        const req = makeMockReq({ num: 0, bool: false, str: "" });
        const res = makeMockRes();
        const next = vi.fn();
        mw(req, res, next);
        expect(next).toHaveBeenCalledOnce();
    });
});
