import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/wizard/start", rpcHandler("wizard.start"));
router.post("/wizard/next", rpcHandler("wizard.next"));
router.post("/wizard/cancel", rpcHandler("wizard.cancel"));
router.post("/wizard/status", rpcHandler("wizard.status"));

export { router as wizardRoutes };
