/**
 * Basic request validation middleware factory.
 *
 * Usage:
 *   router.post("/foo", validateBody(["name", "value"]), handler);
 */
import type { Request, Response, NextFunction } from "express";
import { sendError } from "./response.ts";

/**
 * Creates middleware that checks the request body contains the required fields.
 */
export function validateBody(requiredFields: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.body || typeof req.body !== "object") {
            sendError(res, 400, "Request body must be a JSON object");
            return;
        }
        const missing = requiredFields.filter(
            (field) => !(field in req.body) || req.body[field] === undefined,
        );
        if (missing.length > 0) {
            sendError(res, 400, `Missing required fields: ${missing.join(", ")}`);
            return;
        }
        next();
    };
}
