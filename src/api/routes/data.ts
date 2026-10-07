/**
 * Data import/export routes — cloud-mode endpoints for migrating
 * local OpenClaw data to/from the cloud backend.
 *
 * POST /data/import — Receive a ZIP archive and extract it into the state directory
 * GET  /data/export — Stream the state directory as a ZIP archive
 */
import { Router, type Router as RouterType } from "express";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { resolveStateDir } from "../../config/paths.ts";

const execFileAsync = promisify(execFile);

const router: RouterType = Router();
const MAX_BODY = 100 * 1024 * 1024; // 100 MB

/** Validate that a resolved path is within the expected parent directory (zip-slip protection) */
function isPathWithin(parent: string, child: string): boolean {
  const resolvedParent = path.resolve(parent) + path.sep;
  const resolvedChild = path.resolve(child);
  return resolvedChild.startsWith(resolvedParent) || resolvedChild === path.resolve(parent);
}

/**
 * POST /data/import
 *
 * Accepts a ZIP file (application/zip or multipart) and extracts it into
 * the state directory (~/.openclaw).
 *
 * The ZIP should contain paths relative to the state dir root, e.g.:
 *   openclaw.json
 *   agents/<id>/...
 *   credentials/...
 */
router.post("/data/import", async (req, res) => {
  const stateDir = path.resolve(resolveStateDir());

  try {
    // Check content length
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > MAX_BODY) {
      res.status(413).json({ error: "Upload too large" });
      return;
    }

    // Write the incoming body to a temp file with a safe random name
    const safeName = `import-${randomUUID()}.zip`;
    const tmpZip = path.join(stateDir, safeName);

    // Verify the temp path is within state dir
    if (!isPathWithin(stateDir, tmpZip)) {
      res.status(400).json({ error: "Invalid path" });
      return;
    }

    await fs.mkdir(stateDir, { recursive: true });

    const writeStream = createWriteStream(tmpZip);
    // Track bytes received to enforce limit regardless of Content-Length header
    let bytesReceived = 0;
    const reqStream = req as unknown as Readable;
    reqStream.on("data", (chunk: Buffer) => {
      bytesReceived += chunk.length;
      if (bytesReceived > MAX_BODY) {
        reqStream.destroy(new Error("Upload exceeds maximum size"));
      }
    });
    await pipeline(reqStream, writeStream);

    // Verify the zip is valid before extracting (execFile prevents shell injection)
    try {
      await execFileAsync("unzip", ["-t", tmpZip], { timeout: 30_000 });
    } catch {
      await fs.unlink(tmpZip).catch(() => {});
      res.status(400).json({ error: "Invalid ZIP archive" });
      return;
    }

    // Check for zip-slip: list entries and reject if any escape the state dir
    try {
      const { stdout } = await execFileAsync("unzip", ["-l", tmpZip], { timeout: 30_000 });
      const lines = stdout.split("\n");
      for (const line of lines) {
        // unzip -l output has filenames after the last column
        const match = line.match(/\d{2}:\d{2}\s+(.+)$/);
        if (match) {
          const entryPath = match[1].trim();
          if (entryPath.includes("..") || path.isAbsolute(entryPath)) {
            await fs.unlink(tmpZip).catch(() => {});
            res.status(400).json({ error: "ZIP contains unsafe paths" });
            return;
          }
          // Verify resolved path stays within state dir
          const resolved = path.resolve(stateDir, entryPath);
          if (!isPathWithin(stateDir, resolved)) {
            await fs.unlink(tmpZip).catch(() => {});
            res.status(400).json({ error: "ZIP contains paths that escape the target directory" });
            return;
          }
        }
      }
    } catch {
      await fs.unlink(tmpZip).catch(() => {});
      res.status(400).json({ error: "Failed to inspect ZIP contents" });
      return;
    }

    // Extract into state directory (execFile prevents shell injection)
    await execFileAsync("unzip", ["-o", tmpZip, "-d", stateDir], {
      timeout: 60_000,
    });

    // Clean up temp file
    await fs.unlink(tmpZip).catch(() => {});

    // Count extracted items for feedback
    const items = await countDirItems(stateDir);

    res.json({
      success: true,
      message: "Import completed",
      itemCount: items,
    });
  } catch (err) {
    console.error("[data/import] Failed:", err);
    res.status(500).json({ error: "Import failed" });
  }
});

/**
 * GET /data/export
 *
 * Streams the state directory as a ZIP archive for download/backup.
 * Excludes temporary files, logs, and caches.
 */
router.get("/data/export", async (req, res) => {
  const stateDir = path.resolve(resolveStateDir());

  try {
    // Check that state dir exists
    const exists = await fs
      .stat(stateDir)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      res.status(404).json({ error: "No data to export" });
      return;
    }

    const safeName = `export-${randomUUID()}.zip`;
    const tmpZip = path.join(stateDir, safeName);

    // Create ZIP excluding temp files, logs, caches using execFile (no shell injection)
    await execFileAsync(
      "zip",
      [
        "-r", tmpZip, ".",
        "-x", "export-*.zip", "-x", "import-*.zip",
        "-x", "logs/*", "-x", "*.log",
        "-x", "media/cache/*", "-x", "node_modules/*",
      ],
      { cwd: stateDir, timeout: 120_000 },
    );

    const stat = await fs.stat(tmpZip);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="barrsa-export.zip"`,
    );
    res.setHeader("Content-Length", stat.size);

    const readStream = createReadStream(tmpZip);
    readStream.pipe(res);

    readStream.on("end", () => {
      fs.unlink(tmpZip).catch(() => {});
    });
    readStream.on("error", () => {
      fs.unlink(tmpZip).catch(() => {});
    });
  } catch (err) {
    console.error("[data/export] Failed:", err);
    res.status(500).json({ error: "Export failed" });
  }
});

async function countDirItems(dir: string): Promise<number> {
  try {
    const entries = await fs.readdir(dir, { recursive: true });
    return entries.length;
  } catch {
    return 0;
  }
}

export { router as dataRoutes };
