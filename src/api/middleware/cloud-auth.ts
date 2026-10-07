/**
 * Cloud-auth middleware — validates JWT and tenant identity for cloud-mode backends.
 *
 * When OPENCLAW_CLOUD_MODE=true, every request must carry a valid JWT
 * (via Authorization header or auth-token cookie) and the X-Tenant-ID
 * header must match the tenantId in the JWT claims.
 *
 * Health-check endpoints are excluded so load balancers can probe.
 *
 * Uses Node.js crypto for inline HS256 verification (no external dependency).
 */
import type { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

interface CloudClaims {
    userId: string;
    email: string;
    subdomain?: string;
    tenantId?: string;
}

declare global {
    namespace Express {
        interface Request {
            cloudUser?: CloudClaims;
        }
    }
}

const JWT_ISSUER = "mawadao-auth";
const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

/** Decode a base64url-encoded string */
function base64UrlDecode(str: string): Buffer {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(padded, "base64");
}

/** Verify an HS256 JWT and return the payload, or null if invalid */
function verifyHS256(token: string, secret: string): Record<string, unknown> | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify algorithm
    try {
        const header = JSON.parse(base64UrlDecode(headerB64).toString("utf8"));
        if (header.alg !== "HS256") return null;
    } catch {
        return null;
    }

    // Verify signature using timing-safe comparison
    const expectedSig = createHmac("sha256", secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest();
    const actualSig = base64UrlDecode(signatureB64);

    if (expectedSig.length !== actualSig.length) return null;
    if (!timingSafeEqual(expectedSig, actualSig)) return null;

    // Parse payload
    try {
        const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));

        // Check expiry
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

        // Check issuer
        if (payload.iss && payload.iss !== JWT_ISSUER) return null;

        return payload;
    } catch {
        return null;
    }
}

/** Paths exempt from cloud auth (health checks, readiness probes) */
const EXEMPT_PATHS = ["/healthz", "/readyz", "/api/v1/health"];

export function cloudAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip auth for health-check paths
    if (EXEMPT_PATHS.some((p) => req.path.startsWith(p))) {
        next();
        return;
    }

    // Skip preflight
    if (req.method === "OPTIONS") {
        next();
        return;
    }

    // Extract token from Authorization header or cookie
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
    }
    if (!token) {
        const cookieHeader = req.headers.cookie;
        if (cookieHeader) {
            // Robust cookie parse: split on FIRST '=' only (JWTs and URL-encoded
            // values can legitimately contain '='), and URL-decode the value.
            const match = cookieHeader.split(";").find((c) => c.trim().startsWith("auth-token="));
            if (match) {
                const trimmed = match.trim();
                const eqIdx = trimmed.indexOf("=");
                if (eqIdx >= 0) {
                    const raw = trimmed.slice(eqIdx + 1);
                    try { token = decodeURIComponent(raw); } catch { token = raw; }
                }
            }
        }
    }

    if (!token) {
        res.status(401).json({ success: false, data: null, message: "Missing authentication token" });
        return;
    }

    // Verify JWT. Without a configured secret every token is rejected; there is no default.
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        // eslint-disable-next-line no-console
        console.error("[cloud-auth] JWT_SECRET is not set; rejecting all tokens");
        res.status(503).json({ success: false, data: null, message: "Authentication is not configured" });
        return;
    }
    let claims: CloudClaims;
    const decoded = verifyHS256(token, jwtSecret);
    if (!decoded) {
        if (AUTH_DEBUG) {
            // eslint-disable-next-line no-console
            console.warn("[cloud-auth] JWT verification failed for path:", req.path, "tokenLen:", token.length);
        }
        res.status(401).json({ success: false, data: null, message: "Invalid or expired token" });
        return;
    }
    claims = {
        userId: (decoded.sub as string) || (decoded.userId as string) || "",
        email: (decoded.email as string) || "",
        subdomain: (decoded.subdomain as string) || undefined,
        tenantId: (decoded.tenantId as string) || undefined,
    };
    if (!claims.userId) {
        res.status(401).json({ success: false, data: null, message: "Token missing user identity" });
        return;
    }

    // Validate X-Tenant-ID matches JWT claims (when header is present)
    const headerTenantId = req.headers["x-tenant-id"];
    if (typeof headerTenantId === "string" && headerTenantId.length > 0) {
        if (claims.tenantId && headerTenantId !== claims.tenantId) {
            res.status(403).json({ success: false, data: null, message: "Tenant mismatch" });
            return;
        }
    }

    // Attach claims to request
    req.cloudUser = claims;
    req.tenantId = claims.tenantId || (headerTenantId as string) || undefined;
    next();
}
