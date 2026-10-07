/**
 * Standard JSON response helpers.
 *
 * Every REST endpoint returns the same envelope:
 *   { success: boolean, data: unknown, message: string, error?: unknown }
 */
import type { Response } from "express";

export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T | null;
    message: string;
    error?: unknown;
}

export function sendSuccess<T>(res: Response, data: T, message = "OK"): void {
    const body: ApiResponse<T> = { success: true, data, message };
    res.status(200).json(body);
}

export function sendError(
    res: Response,
    statusCode: number,
    message: string,
    error?: unknown,
): void {
    const body: ApiResponse = { success: false, data: null, message, error };
    res.status(statusCode).json(body);
}
