/**
 * Tenant middleware — extracts X-Tenant-ID from request headers
 * and attaches it to the request for downstream use.
 */
import type { Request, Response, NextFunction } from "express";

declare global {
    namespace Express {
        interface Request {
            tenantId?: string;
        }
    }
}

export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = req.headers["x-tenant-id"];
    if (typeof tenantId === "string" && tenantId.length > 0) {
        req.tenantId = tenantId;
    }
    // Tenant is optional for MVP — don't reject requests without it
    next();
}
