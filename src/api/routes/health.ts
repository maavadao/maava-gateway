import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

// CLI: openclaw gateway health
router.post("/health", rpcHandler("health"));

// CLI: openclaw status
router.post("/status", rpcHandler("status"));

export { router as healthRoutes };
