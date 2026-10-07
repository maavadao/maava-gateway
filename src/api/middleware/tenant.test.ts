import { describe, expect, test, vi } from "vitest";
import { tenantMiddleware } from "./tenant.js";
import type { Request, Response, NextFunction } from "express";

function makeMockReq(headers: Record<string, string | undefined> = {}): Request {
    return {
        headers: Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
        ),
    } as unknown as Request;
}

const mockRes = {} as Response;

describe("tenantMiddleware", () => {
    test("extracts X-Tenant-ID header and attaches to req", () => {
        const req = makeMockReq({ "x-tenant-id": "tenant-123" });
        const next = vi.fn();
        tenantMiddleware(req, mockRes, next);
        expect(req.tenantId).toBe("tenant-123");
        expect(next).toHaveBeenCalledOnce();
    });

    test("does not set tenantId when header is missing", () => {
        const req = makeMockReq();
        const next = vi.fn();
        tenantMiddleware(req, mockRes, next);
        expect(req.tenantId).toBeUndefined();
        expect(next).toHaveBeenCalledOnce();
    });

    test("does not set tenantId when header is empty string", () => {
        const req = makeMockReq({ "x-tenant-id": "" });
        const next = vi.fn();
        tenantMiddleware(req, mockRes, next);
        expect(req.tenantId).toBeUndefined();
        expect(next).toHaveBeenCalledOnce();
    });

    test("always calls next even without tenant", () => {
        const req = makeMockReq();
        const next = vi.fn();
        tenantMiddleware(req, mockRes, next);
        expect(next).toHaveBeenCalledOnce();
    });
});
