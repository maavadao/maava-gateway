/**
 * In-memory rate limiting middleware for Express (cloud mode).
 *
 * Limits requests per IP or authenticated user. Uses a sliding window
 * counter stored in a Map. For multi-instance deployments, replace
 * with a Redis-based implementation.
 */
import type { Request, Response, NextFunction } from "express";

interface Entry {
    count: number;
    resetAt: number;
}

const store = new Map<string, Entry>();

// Cleanup expired entries every 60 seconds
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.resetAt <= now) store.delete(key);
    }
}, 60_000);
cleanupInterval.unref();

export interface RateLimitOptions {
    /** Max requests per window */
    max: number;
    /** Window size in seconds */
    windowSec: number;
    /** Key extractor — defaults to IP + path prefix */
    keyFn?: (req: Request) => string;
}

/**
 * Creates Express rate limiting middleware.
 */
export function rateLimit(opts: RateLimitOptions) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const key = opts.keyFn
            ? opts.keyFn(req)
            : `${req.ip || req.headers["x-forwarded-for"] || "unknown"}`;

        const now = Date.now();
        const entry = store.get(key);

        if (!entry || entry.resetAt <= now) {
            store.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 });
            res.setHeader("X-RateLimit-Limit", opts.max);
            res.setHeader("X-RateLimit-Remaining", opts.max - 1);
            next();
            return;
        }

        if (entry.count >= opts.max) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.setHeader("Retry-After", retryAfter);
            res.setHeader("X-RateLimit-Limit", opts.max);
            res.setHeader("X-RateLimit-Remaining", 0);
            res.status(429).json({
                success: false,
                data: null,
                message: "Too many requests. Please try again later.",
            });
            return;
        }

        entry.count++;
        res.setHeader("X-RateLimit-Limit", opts.max);
        res.setHeader("X-RateLimit-Remaining", opts.max - entry.count);
        next();
    };
}
