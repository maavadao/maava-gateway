# REST API Migration Report

**Date:** February 12, 2026  
**Scope:** CLI-to-REST API layer for the OpenClaw gateway  
**Status:** Functional MVP — all unit and E2E tests passing

---

## 1. What Was Built

A complete REST API layer (`src/api/`) that sits alongside the existing WebSocket gateway. Instead of duplicating business logic, the API acts as a **bridge**: it receives standard HTTP POST requests, translates them into the same RPC calls the WebSocket layer uses, and returns JSON responses.

**Key design decisions:**
- **Zero business logic duplication** — every endpoint calls the existing gateway RPC handler via a bridge function
- **Standard JSON envelope** — all responses follow `{ success, data, message, error? }`
- **Opt-in activation** — the REST server only starts when `OPENCLAW_REST_API=1` is set
- **Separate port** — runs on its own port (default 3000, configurable via `OPENCLAW_REST_PORT`)
- **Multi-tenancy ready** — `X-Tenant-ID` header extracted and attached to every request

---

## 2. Files Changed / Created

### Modified (1 file)

| File | What Changed |
|------|-------------|
| `src/gateway/server.impl.ts` | Extracted the gateway context object into a named variable so both the WebSocket handlers and the new REST server share the same runtime state. Added conditional REST server startup when `OPENCLAW_REST_API=1`. Added REST server shutdown in the gateway's close/cleanup path. |

### New Source Files (23 files, ~537 lines total)

| File | Lines | Purpose |
|------|-------|---------|
| **`src/api/rest-server.ts`** | 117 | Main Express app factory + server startup. Registers global middleware (JSON parsing, CORS, tenant extraction), mounts all route modules under `/api/v1`, and provides 404 + global error handlers. |
| **`src/api/bridge.ts`** | 75 | The core translation layer. Takes an RPC method name + params, builds a fake `RequestFrame`, creates a shim `respond()` callback, calls the existing gateway handler, and captures the result as a Promise. This is what makes "zero duplication" possible. |
| **`src/api/middleware/tenant.ts`** | 20 | Extracts `X-Tenant-ID` from request headers. Optional for MVP — requests without it are allowed through. |
| **`src/api/middleware/response.ts`** | 26 | Two helpers: `sendSuccess(res, data)` and `sendError(res, code, message)`. Every endpoint uses these so the JSON envelope is consistent. |
| **`src/api/middleware/validate.ts`** | 27 | Factory function `validateBody(["field1", "field2"])` that returns Express middleware. Checks that required fields exist in the request body, returns 400 with details if not. |
| **`src/api/routes/_handler.ts`** | 50 | `rpcHandler("method.name")` — a factory that creates an Express route handler. It pulls params from `req.body`, calls the bridge, and formats the response. Every route file uses this instead of writing boilerplate. |
| **`src/api/routes/index.ts`** | 19 | Re-exports all 16 route modules for clean registration in the main app. |
| **`src/api/routes/health.ts`** | 8 | `/health` and `/status` endpoints. |
| **`src/api/routes/config.ts`** | 9 | `/config/get`, `/config/set`, `/config/apply`, `/config/patch`, `/config/schema`. |
| **`src/api/routes/agents.ts`** | 13 | `/agent/run`, `/agent/identity`, `/agent/wait`, `/agents/list`, `/agents/files/*`. |
| **`src/api/routes/channels.ts`** | 6 | `/channels/status`, `/channels/logout`. |
| **`src/api/routes/sessions.ts`** | 10 | `/sessions/list`, `/preview`, `/patch`, `/reset`, `/delete`, `/compact`. |
| **`src/api/routes/models.ts`** | 5 | `/models/list`. |
| **`src/api/routes/messages.ts`** | 6 | `/messages/send`, `/messages/wake`. |
| **`src/api/routes/cron.ts`** | 11 | `/cron/list`, `/status`, `/add`, `/update`, `/remove`, `/run`, `/runs`. |
| **`src/api/routes/skills.ts`** | 8 | `/skills/status`, `/bins`, `/install`, `/update`. |
| **`src/api/routes/nodes.ts`** | 15 | `/nodes/list`, `/describe`, `/invoke`, `/rename`, `/event`, `/pair/*`. |
| **`src/api/routes/devices.ts`** | 9 | `/devices/pair/list`, `/approve`, `/reject`, `/token/rotate`, `/token/revoke`. |
| **`src/api/routes/tts.ts`** | 10 | `/tts/status`, `/providers`, `/enable`, `/disable`, `/convert`, `/set-provider`. |
| **`src/api/routes/wizard.ts`** | 8 | `/wizard/start`, `/next`, `/cancel`, `/status`. |
| **`src/api/routes/chat.ts`** | 7 | `/chat/history`, `/send`, `/abort`. |
| **`src/api/routes/logs.ts`** | 5 | `/logs/tail`. |
| **`src/api/routes/misc.ts`** | 28 | Catch-all for: usage, talk mode, voicewake, system (presence/event/heartbeat), update, browser, exec approvals. |

### New Test Files (7 files, ~922 lines total)

| File | Lines | Tests | Type |
|------|-------|-------|------|
| `src/api/bridge.test.ts` | 124 | 10 | Unit |
| `src/api/middleware/tenant.test.ts` | 40 | 4 | Unit |
| `src/api/middleware/response.test.ts` | 78 | 6 | Unit |
| `src/api/middleware/validate.test.ts` | 98 | 8 | Unit |
| `src/api/routes/_handler.test.ts` | 78 | 3 | Unit |
| `src/api/test-helpers.ts` | 81 | — | Test utilities |
| `src/api/rest-server.e2e.test.ts` | 423 | 43 | E2E |

---

## 3. How It Works (Architecture)

```
HTTP Client (cURL / Postman / future GUI)
         │
         ▼
  ┌─────────────────────────────────┐
  │   Express App (rest-server.ts)  │  Port 3000 (configurable)
  │                                 │
  │  ┌── JSON Parser ──────────┐   │
  │  │  CORS Middleware        │   │
  │  │  Tenant Middleware      │   │
  │  │  Route Modules ×16     │   │
  │  │  404 Handler            │   │
  │  │  Error Handler          │   │
  │  └────────────────────────-┘   │
  └──────────────┬──────────────────┘
                 │
                 │  rpcHandler("method.name")
                 │  reads req.body → params
                 ▼
  ┌─────────────────────────────────┐
  │   Bridge (bridge.ts)            │
  │                                 │
  │  callGatewayMethod(             │
  │    method, params, context      │
  │  )                              │
  │                                 │
  │  Builds fake RequestFrame       │
  │  Creates shim respond() fn      │
  │  Calls existing RPC handler     │
  │  Returns { ok, data, error }    │
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │  Gateway RPC Handlers           │  ← Same code the WebSocket
  │  (src/gateway/server-methods/)  │    layer already uses
  │                                 │
  │  health, config, agents,        │
  │  sessions, models, cron, etc.   │
  └─────────────────────────────────┘
```

**The bridge is the key innovation.** The existing gateway handlers all follow the same pattern:
```ts
handler({ req, params, client, respond, context }) → void
```
The bridge creates a fake `req` (RequestFrame), sets `client: null` (no WebSocket), captures what the handler passes to `respond()`, and returns it as a normal Promise. This means every existing handler works through REST without any modification.

---

## 4. Complete Endpoint Map

All endpoints are `POST /api/v1/{path}` unless noted.

| Category | Endpoint | Gateway RPC Method | Notes |
|----------|----------|-------------------|-------|
| **Health** | `/health` | `health` | Returns gateway health snapshot |
| | `/status` | `status` | Returns status summary |
| **Config** | `/config/get` | `config.get` | Read current config |
| | `/config/set` | `config.set` | Write full config |
| | `/config/apply` | `config.apply` | Apply config changes |
| | `/config/patch` | `config.patch` | Partial config update |
| | `/config/schema` | `config.schema` | Get config JSON schema |
| **Agents** | `/agent/run` | `agent` | Run an agent |
| | `/agent/identity` | `agent.identity.get` | Get agent identity |
| | `/agent/wait` | `agent.wait` | Wait for agent result |
| | `/agents/list` | `agents.list` | List all agents |
| | `/agents/files/list` | `agents.files.list` | List agent files |
| | `/agents/files/get` | `agents.files.get` | Get agent file |
| | `/agents/files/set` | `agents.files.set` | Set agent file |
| **Channels** | `/channels/status` | `channels.status` | Channel connection status |
| | `/channels/logout` | `channels.logout` | Logout a channel |
| **Sessions** | `/sessions/list` | `sessions.list` | List sessions |
| | `/sessions/preview` | `sessions.preview` | Preview session |
| | `/sessions/patch` | `sessions.patch` | Patch session |
| | `/sessions/reset` | `sessions.reset` | Reset session |
| | `/sessions/delete` | `sessions.delete` | Delete session |
| | `/sessions/compact` | `sessions.compact` | Compact session |
| **Models** | `/models/list` | `models.list` | List available models |
| **Messages** | `/messages/send` | `send` | Send a message |
| | `/messages/wake` | `wake` | Wake/trigger agent |
| **Cron** | `/cron/list` | `cron.list` | List cron jobs |
| | `/cron/status` | `cron.status` | Cron system status |
| | `/cron/add` | `cron.add` | Add cron job |
| | `/cron/update` | `cron.update` | Update cron job |
| | `/cron/remove` | `cron.remove` | Remove cron job |
| | `/cron/run` | `cron.run` | Trigger cron run |
| | `/cron/runs` | `cron.runs` | List cron runs |
| **Skills** | `/skills/status` | `skills.status` | Skills status |
| | `/skills/bins` | `skills.bins` | List skill binaries |
| | `/skills/install` | `skills.install` | Install skill |
| | `/skills/update` | `skills.update` | Update skill |
| **Nodes** | `/nodes/list` | `node.list` | List nodes |
| | `/nodes/describe` | `node.describe` | Describe a node |
| | `/nodes/invoke` | `node.invoke` | Invoke node command |
| | `/nodes/rename` | `node.rename` | Rename node |
| | `/nodes/event` | `node.event` | Send node event |
| | `/nodes/pair/request` | `node.pair.request` | Request pairing |
| | `/nodes/pair/list` | `node.pair.list` | List pair requests |
| | `/nodes/pair/approve` | `node.pair.approve` | Approve pairing |
| | `/nodes/pair/reject` | `node.pair.reject` | Reject pairing |
| | `/nodes/pair/verify` | `node.pair.verify` | Verify pairing |
| **Devices** | `/devices/pair/list` | `device.pair.list` | List device pairs |
| | `/devices/pair/approve` | `device.pair.approve` | Approve device |
| | `/devices/pair/reject` | `device.pair.reject` | Reject device |
| | `/devices/token/rotate` | `device.token.rotate` | Rotate token |
| | `/devices/token/revoke` | `device.token.revoke` | Revoke token |
| **TTS** | `/tts/status` | `tts.status` | TTS status |
| | `/tts/providers` | `tts.providers` | List TTS providers |
| | `/tts/enable` | `tts.enable` | Enable TTS |
| | `/tts/disable` | `tts.disable` | Disable TTS |
| | `/tts/convert` | `tts.convert` | Convert text to speech |
| | `/tts/set-provider` | `tts.setProvider` | Set TTS provider |
| **Wizard** | `/wizard/start` | `wizard.start` | Start setup wizard |
| | `/wizard/next` | `wizard.next` | Next wizard step |
| | `/wizard/cancel` | `wizard.cancel` | Cancel wizard |
| | `/wizard/status` | `wizard.status` | Wizard session status |
| **Chat** | `/chat/history` | `chat.history` | Get chat history |
| | `/chat/send` | `chat.send` | Send chat message |
| | `/chat/abort` | `chat.abort` | Abort running chat |
| **Logs** | `/logs/tail` | `logs.tail` | Tail log entries |
| **Usage** | `/usage/status` | `usage.status` | Token usage status |
| | `/usage/cost` | `usage.cost` | Usage cost breakdown |
| **Talk** | `/talk/mode` | `talk.mode` | Talk mode control |
| **Voicewake** | `/voicewake/get` | `voicewake.get` | Get wake triggers |
| | `/voicewake/set` | `voicewake.set` | Set wake triggers |
| **System** | `/system/presence` | `system-presence` | Connected clients |
| | `/system/event` | `system-event` | Send system event |
| | `/system/heartbeat` | `last-heartbeat` | Last heartbeat |
| | `/system/heartbeats` | `set-heartbeats` | Toggle heartbeats |
| **Update** | `/update/run` | `update.run` | Trigger update |
| **Browser** | `/browser/request` | `browser.request` | Browser request |
| **Exec Approvals** | `/exec/approvals/get` | `exec.approvals.get` | Get approval settings |
| | `/exec/approvals/set` | `exec.approvals.set` | Set approval settings |
| | `/exec/approvals/node/get` | `exec.approvals.node.get` | Node approval settings |
| | `/exec/approvals/node/set` | `exec.approvals.node.set` | Set node approvals |
| | `/exec/approval/request` | `exec.approval.request` | Request approval |
| | `/exec/approval/resolve` | `exec.approval.resolve` | Resolve approval |

**Total: ~65 endpoints across 16 route modules.**

---

## 5. What the Tests Do (Plain English)

### Unit Tests (32 tests) — Fast, No Server Needed

These test individual pieces in isolation using mock objects. They run in milliseconds.

#### `bridge.test.ts` — 10 tests
Tests the core bridge function that translates HTTP calls into gateway RPC calls:
- **"Unknown method"**: If you call a method that doesn't exist (like `nonexistent.method`), it returns an error with code `INVALID_REQUEST` instead of crashing.
- **"Sync handler"**: When a gateway handler calls `respond(true, data)` synchronously, the bridge correctly captures it.
- **"Failed handler"**: When a handler calls `respond(false, ..., error)`, the bridge returns `ok: false` with the error details.
- **"Async handler"**: Handlers that use `await` (async) work just as well — the bridge waits for them.
- **"Handler throws"**: If a handler crashes with an exception, the bridge catches it and returns a clean `INTERNAL_ERROR` instead of letting it bubble up.
- **"Meta capture"**: The bridge preserves the optional `meta` field (e.g., `{ cached: true }`) from responses.
- **"Params passthrough"**: Whatever params you send in are exactly what the handler receives.
- **"Context passthrough"**: The gateway context object reaches the handler untouched.
- **"Client is null"**: REST calls correctly set `client: null` (there's no WebSocket connection).
- **"RequestFrame shape"**: The fake request object has the right `type`, `id`, `method`, and `params` fields.

#### `tenant.test.ts` — 4 tests
Tests the X-Tenant-ID header extraction middleware:
- Extracts `tenant-123` from the header and puts it on `req.tenantId`.
- When no header is sent, `req.tenantId` stays `undefined` (no crash).
- Empty string header is treated as "no tenant" (not set).
- Always calls `next()` so the request continues — tenant is optional for MVP.

#### `response.test.ts` — 6 tests
Tests the standard JSON response helpers:
- `sendSuccess` returns HTTP 200 with `{ success: true, data: {foo: "bar"}, message: "OK" }`.
- Custom messages work: `sendSuccess(res, 42, "Created")` → `message: "Created"`.
- Null data is fine: `sendSuccess(res, null)` → `data: null`.
- `sendError` with 404 returns `{ success: false, data: null, message: "Not found" }`.
- Error details are included when provided: `error: { code: "BANG" }`.
- Works with different HTTP status codes (400, 500, etc.).

#### `validate.test.ts` — 8 tests
Tests the request body validation middleware:
- When all required fields are present, it calls `next()` (request proceeds).
- Missing a required field → 400 error naming the missing field.
- A field set to `undefined` counts as missing.
- `null` body → 400 "Request body must be a JSON object".
- Non-object body (like a string) → 400 error.
- Lists ALL missing fields in the error message, not just the first one.
- Empty required-fields array → always passes (no requirements).
- Falsy but real values (`0`, `false`, `""`) are accepted as valid.

#### `_handler.test.ts` — 3 tests (+ 1 context test)
Tests the `rpcHandler` factory and gateway context management:
- `setGatewayContext` + `getGatewayContext` correctly stores and retrieves the context.
- Calling `rpcHandler("health")` returns a function that, when called, produces a structured `{ success, message }` response.
- Request body params are forwarded to the bridge.
- An unknown method like `"totally.fake.method"` → 500 error with the method name in the message.

---

### E2E Tests (43 tests) — Full Integration, Real Gateway

These spin up a **real gateway server** (WebSocket + REST) and hit actual HTTP endpoints. They take ~100 seconds because they boot the full system.

#### Server Infrastructure (4 tests)
- **API info**: `GET /api/v1` returns `{ name: "OpenClaw REST API", version: "1.0.0" }`.
- **CORS**: An `OPTIONS` preflight request returns 204 with proper CORS headers (`Access-Control-Allow-Origin: *`, etc.).
- **404 handling**: Unknown paths return `{ success: false, message: "Not found: ..." }`.
- **Tenant header**: Sending `X-Tenant-ID: tenant-abc` doesn't break anything (accepted cleanly).

#### Health & Status (4 tests)
- `/health` returns `{ ok: true }` — confirms the gateway is alive.
- `/status` returns `{ ok: true }` — confirms status summary works.
- **Parity check**: The REST `/health` response matches what a WebSocket RPC `health` call returns (same `ok` value, same `defaultAgentId`).
- **Parity check**: Same for `/status`.

#### Config (3 tests)
- `/config/get` returns the current configuration.
- `/config/schema` returns the config JSON schema.
- **Parity check**: REST `config.get` matches WebSocket `config.get`.

#### Sessions, Models, Agents, Channels (8 tests)
- Each "list" endpoint returns 200 with `success: true`.
- Parity checks confirm REST responses match WebSocket responses.

#### Cron (2 tests)
- `/cron/list` and `/cron/status` both return structured responses.

#### System / Misc (5 tests)
- `/system/presence` returns an array of connected clients.
- **Parity check**: REST presence matches WebSocket presence.
- `/system/event` accepts a `{ text: "test" }` body.
- `/system/heartbeat` returns the last heartbeat.
- `/system/heartbeats` can toggle heartbeats on/off and reflects the change.

#### Voicewake (2 tests)
- `/voicewake/get` returns `{ triggers: [...] }`.
- **Parity check**: REST triggers match WebSocket triggers.

#### Wizard (2 tests)
- Without a `sessionId`, returns 500 (validation error — expected behavior).
- With an unknown `sessionId`, also returns 500 (wizard not found — expected behavior).

#### Logs, Usage, Skills, TTS, Nodes, Devices (8 tests)
- Each endpoint returns 200 with `success: true`.
- Skills tests include both `/skills/status` and `/skills/bins`.
- TTS tests include both `/tts/status` and `/tts/providers`.
- Node tests include `/nodes/list` and `/nodes/pair/list`.
- Device test covers `/devices/pair/list`.

#### Exec Approvals (2 tests)
- `/exec/approvals/get` returns approval settings (200).
- `/exec/approvals/node/get` without `nodeId` returns 500 (validation error — expected).

#### Response Envelope Consistency (2 tests)
- **All successful responses** across 9 key endpoints are checked to have `success`, `data`, and `message` fields.
- **Error responses** have `success: false` and a string `message`.

#### Parity Checks (Summary)
7 of the E2E tests are **parity checks** — they call both the REST endpoint and the WebSocket RPC method simultaneously and verify they return equivalent data. This ensures the REST layer isn't accidentally transforming or dropping data.

---

## 6. How to Run

```bash
# Start gateway with REST API enabled
OPENCLAW_REST_API=1 OPENCLAW_REST_PORT=3000 openclaw gateway run

# Run unit tests only (fast, ~15s)
npx vitest run src/api/bridge.test.ts src/api/middleware/tenant.test.ts src/api/middleware/response.test.ts src/api/middleware/validate.test.ts src/api/routes/_handler.test.ts

# Run E2E tests (boots full gateway, ~2min)
npx vitest run src/api/rest-server.e2e.test.ts --config vitest.e2e.config.ts

# Quick smoke test with cURL
curl -s http://localhost:3000/api/v1/health -X POST | jq
curl -s http://localhost:3000/api/v1/config/get -X POST | jq
curl -s http://localhost:3000/api/v1/models/list -X POST | jq

# With tenant header
curl -s http://localhost:3000/api/v1/health -X POST -H "X-Tenant-ID: org-123" | jq
```

---

## 7. What's Left (Future Work)

- **Authentication**: Currently wide open — add API key / JWT validation middleware
- **Rate limiting**: No throttling yet
- **Streaming endpoints**: `chat.send` and `agent/run` return final results only; real-time streaming would need SSE or WebSocket upgrade
- **Input validation per endpoint**: Only the `validateBody` middleware exists; individual endpoints don't yet enforce field-level schemas on the REST side (the gateway handlers do their own validation)
- **Database-backed tenancy**: Tenant ID is extracted but not yet used to scope file paths or data
- **OpenAPI / Swagger docs**: No auto-generated API documentation yet
- **Production CORS**: Currently allows all origins (`*`)
