import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/skills/status", rpcHandler("skills.status"));
router.post("/skills/bins", rpcHandler("skills.bins"));
router.post("/skills/install", rpcHandler("skills.install"));
router.post("/skills/update", rpcHandler("skills.update"));

export { router as skillRoutes };
