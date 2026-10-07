#!/usr/bin/env node
import process from "node:process";
import { fileURLToPath } from "node:url";
import { getReplyFromConfig } from "./auto-reply/reply.ts";
import { applyTemplate } from "./auto-reply/templating.ts";
import { monitorWebChannel } from "./channel-web.ts";
import { createDefaultDeps } from "./cli/deps.ts";
import { promptYesNo } from "./cli/prompt.ts";
import { waitForever } from "./cli/wait.ts";
import { loadConfig } from "./config/config.ts";
import {
  deriveSessionKey,
  loadSessionStore,
  resolveSessionKey,
  resolveStorePath,
  saveSessionStore,
} from "./config/sessions.ts";
import { ensureBinary } from "./infra/binaries.ts";
import { loadDotEnv } from "./infra/dotenv.ts";
import { normalizeEnv } from "./infra/env.ts";
import { formatUncaughtError } from "./infra/errors.ts";
import { isMainModule } from "./infra/is-main.ts";
import { ensureOpenClawCliOnPath } from "./infra/path-env.ts";
import {
  describePortOwner,
  ensurePortAvailable,
  handlePortError,
  PortInUseError,
} from "./infra/ports.ts";
import { assertSupportedRuntime } from "./infra/runtime-guard.ts";
import { installUnhandledRejectionHandler } from "./infra/unhandled-rejections.ts";
import { enableConsoleCapture } from "./logging.ts";
import { runCommandWithTimeout, runExec } from "./process/exec.ts";
import { assertWebChannel, normalizeE164, toWhatsappJid } from "./utils.ts";

loadDotEnv({ quiet: true });
normalizeEnv();
ensureOpenClawCliOnPath();

// Capture all console output into structured logs while keeping stdout/stderr behavior.
enableConsoleCapture();

// Enforce the minimum supported runtime before doing any work.
assertSupportedRuntime();

import { buildProgram } from "./cli/program.ts";

const program = buildProgram();

export {
  assertWebChannel,
  applyTemplate,
  createDefaultDeps,
  deriveSessionKey,
  describePortOwner,
  ensureBinary,
  ensurePortAvailable,
  getReplyFromConfig,
  handlePortError,
  loadConfig,
  loadSessionStore,
  monitorWebChannel,
  normalizeE164,
  PortInUseError,
  promptYesNo,
  resolveSessionKey,
  resolveStorePath,
  runCommandWithTimeout,
  runExec,
  saveSessionStore,
  toWhatsappJid,
  waitForever,
};

const isMain = isMainModule({
  currentFile: fileURLToPath(import.meta.url),
});

if (isMain) {
  // Global error handlers to prevent silent crashes from unhandled rejections/exceptions.
  // These log the error and exit gracefully instead of crashing without trace.
  installUnhandledRejectionHandler();

  process.on("uncaughtException", (error) => {
    console.error("[openclaw] Uncaught exception:", formatUncaughtError(error));
    process.exit(1);
  });

  void program.parseAsync(process.argv).catch((err) => {
    console.error("[openclaw] CLI failed:", formatUncaughtError(err));
    process.exit(1);
  });
}
