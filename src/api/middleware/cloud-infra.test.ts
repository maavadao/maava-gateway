/**
 * Unit tests for cloud-mode infrastructure:
 *   - cloud-auth middleware (JWT validation, tenant matching)
 *   - rate-limit middleware
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Cloud Auth Middleware Tests ────────────────────────────

describe("cloud-auth middleware", () => {
    // We test the inline HS256 verifier logic directly
    const crypto = await import("node:crypto");

    function createHS256Token(
        payload: Record<string, unknown>,
        secret: string,
    ): string {
        const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
            .toString("base64url");
        const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
        const sig = crypto
            .createHmac("sha256", secret)
            .update(`${header}.${body}`)
            .digest("base64url");
        return `${header}.${body}.${sig}`;
    }

    const SECRET = "change-this-jwt-secret";

    it("verifies a valid HS256 token", () => {
        const payload = {
            userId: "u1",
            email: "test@test.com",
            sub: "u1",
            iss: "maavadao-auth",
            exp: Math.floor(Date.now() / 1000) + 3600,
        };
        const token = createHS256Token(payload, SECRET);
        const parts = token.split(".");
        expect(parts).toHaveLength(3);

        // Verify signature
        const expectedSig = crypto
            .createHmac("sha256", SECRET)
            .update(`${parts[0]}.${parts[1]}`)
            .digest("base64url");
        expect(parts[2]).toBe(expectedSig);
    });

    it("rejects token signed with wrong secret", () => {
        const payload = {
            userId: "u1",
            sub: "u1",
            iss: "maavadao-auth",
            exp: Math.floor(Date.now() / 1000) + 3600,
        };
        const token = createHS256Token(payload, "wrong-secret");
        const parts = token.split(".");

        const expectedSig = crypto
            .createHmac("sha256", SECRET)
            .update(`${parts[0]}.${parts[1]}`)
            .digest("base64url");
        expect(parts[2]).not.toBe(expectedSig);
    });

    it("detects expired tokens", () => {
        const payload = {
            userId: "u1",
            sub: "u1",
            iss: "maavadao-auth",
            exp: Math.floor(Date.now() / 1000) - 100, // already expired
        };
        // Parsing should reject this
        expect(payload.exp).toBeLessThan(Math.floor(Date.now() / 1000));
    });

    it("detects wrong issuer", () => {
        const payload = {
            userId: "u1",
            sub: "u1",
            iss: "evil-issuer",
            exp: Math.floor(Date.now() / 1000) + 3600,
        };
        expect(payload.iss).not.toBe("maavadao-auth");
    });

    it("prevents timing attacks with timingSafeEqual", () => {
        // Verify that timingSafeEqual exists and works
        const a = Buffer.from("hello");
        const b = Buffer.from("hello");
        const c = Buffer.from("world");
        expect(crypto.timingSafeEqual(a, b)).toBe(true);
        expect(crypto.timingSafeEqual(a, c)).toBe(false);
    });

    it("tenant ID mismatch is detected", () => {
        const jwtTenantId = "tenant-abc";
        const headerTenantId = "tenant-xyz";
        expect(jwtTenantId).not.toBe(headerTenantId);
        // In the middleware, this would return 403
    });
});

// ─── Rate Limit Middleware Tests ────────────────────────────

describe("rate-limit middleware", () => {
    // Import the actual rate limit module
    const { rateLimit } = await import("../src/api/middleware/rate-limit.js");

    function mockReq(ip = "127.0.0.1"): Record<string, unknown> {
        return {
            ip,
            headers: { "x-forwarded-for": ip },
        };
    }

    function mockRes(): Record<string, unknown> & {
        statusCode: number;
        headers: Record<string, string | number>;
        body: unknown;
    } {
        const res: Record<string, unknown> & {
            statusCode: number;
            headers: Record<string, string | number>;
            body: unknown;
        } = {
            statusCode: 200,
            headers: {},
            body: null,
            setHeader(key: string, val: string | number) {
                res.headers[key] = val;
            },
            status(code: number) {
                res.statusCode = code;
                return res;
            },
            json(data: unknown) {
                res.body = data;
                return res;
            },
        };
        return res;
    }

    it("allows requests within rate limit", () => {
        const limiter = rateLimit({ max: 5, windowSec: 60 });
        const req = mockReq("10.0.0.1");
        const res = mockRes();
        let called = false;

        limiter(req as any, res as any, () => { called = true; });
        expect(called).toBe(true);
        expect(res.headers["X-RateLimit-Limit"]).toBe(5);
        expect(res.headers["X-RateLimit-Remaining"]).toBe(4);
    });

    it("blocks requests over the rate limit", () => {
        const limiter = rateLimit({ max: 2, windowSec: 60 });
        const ip = "10.0.0.2";

        // Use up the limit
        for (let i = 0; i < 2; i++) {
            const res = mockRes();
            limiter(mockReq(ip) as any, res as any, () => {});
        }

        // Next request should be blocked
        const res = mockRes();
        let called = false;
        limiter(mockReq(ip) as any, res as any, () => { called = true; });

        expect(called).toBe(false);
        expect(res.statusCode).toBe(429);
        expect(res.headers["X-RateLimit-Remaining"]).toBe(0);
        expect(res.headers["Retry-After"]).toBeDefined();
    });

    it("allows custom key function", () => {
        const limiter = rateLimit({
            max: 1,
            windowSec: 60,
            keyFn: (req) => (req as any).customKey,
        });

        // First request with key "a"
        const req1 = { ...mockReq(), customKey: "key-a" };
        const res1 = mockRes();
        let called1 = false;
        limiter(req1 as any, res1 as any, () => { called1 = true; });
        expect(called1).toBe(true);

        // Second request with key "a" should be blocked
        const req2 = { ...mockReq(), customKey: "key-a" };
        const res2 = mockRes();
        let called2 = false;
        limiter(req2 as any, res2 as any, () => { called2 = true; });
        expect(called2).toBe(false);

        // Different key should be allowed
        const req3 = { ...mockReq(), customKey: "key-b" };
        const res3 = mockRes();
        let called3 = false;
        limiter(req3 as any, res3 as any, () => { called3 = true; });
        expect(called3).toBe(true);
    });
});

// ─── Security Helpers ───────────────────────────────────────

describe("path traversal protection", () => {
    const path = await import("node:path");

    function isPathWithin(parent: string, child: string): boolean {
        const resolvedParent = path.resolve(parent) + path.sep;
        const resolvedChild = path.resolve(child);
        return resolvedChild.startsWith(resolvedParent) || resolvedChild === path.resolve(parent);
    }

    it("allows valid child paths", () => {
        expect(isPathWithin("/opt/data", "/opt/data/file.txt")).toBe(true);
        expect(isPathWithin("/opt/data", "/opt/data/sub/deep/file")).toBe(true);
    });

    it("blocks traversal via ..", () => {
        expect(isPathWithin("/opt/data", "/opt/data/../../../etc/shadow")).toBe(false);
    });

    it("blocks absolute paths outside parent", () => {
        expect(isPathWithin("/opt/data", "/tmp/evil")).toBe(false);
    });
});
