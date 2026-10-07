/**
 * REST API test helpers — provides utilities for starting a gateway+REST server
 * and making HTTP requests during tests.
 */
import { createRestApp } from "./rest-server.js";
import type { GatewayRequestContext } from "../gateway/server-methods/types.js";
import type { Server } from "node:http";

export { installGatewayTestHooks, getFreePort, startGatewayServer } from "../gateway/test-helpers.js";

export interface RestTestServer {
    /** HTTP base URL, e.g. http://127.0.0.1:3001 */
    baseUrl: string;
    /** The underlying HTTP server for cleanup */
    httpServer: Server;
    /** Close the REST server */
    close: () => Promise<void>;
}

/**
 * Start a standalone REST API server backed by the given gateway context.
 * Picks a free port automatically.
 */
export async function startRestTestServer(
    context: GatewayRequestContext,
    port: number,
): Promise<RestTestServer> {
    const app = createRestApp(context);
    return new Promise<RestTestServer>((resolve, reject) => {
        const httpServer = app.listen(port, "127.0.0.1", () => {
            const baseUrl = `http://127.0.0.1:${port}`;
            resolve({
                baseUrl,
                httpServer,
                close: () => new Promise<void>((r, rej) => httpServer.close((e) => (e ? rej(e) : r()))),
            });
        });
        httpServer.on("error", reject);
    });
}

/**
 * POST JSON to a REST API endpoint and return the parsed response.
 */
export async function restPost(
    baseUrl: string,
    path: string,
    body: Record<string, unknown> = {},
    headers: Record<string, string> = {},
): Promise<{
    status: number;
    body: {
        success: boolean;
        data: unknown;
        message: string;
        error?: unknown;
    };
}> {
    const url = `${baseUrl}/api/v1${path}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: JSON.stringify(body),
    });
    const json = await res.json();
    return { status: res.status, body: json };
}

/**
 * GET a REST API endpoint and return the parsed response.
 */
export async function restGet(
    baseUrl: string,
    path: string,
): Promise<{
    status: number;
    body: unknown;
}> {
    const url = `${baseUrl}${path}`;
    const res = await fetch(url);
    const json = await res.json();
    return { status: res.status, body: json };
}
