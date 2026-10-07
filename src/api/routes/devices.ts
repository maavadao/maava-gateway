import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/devices/pair/list", rpcHandler("device.pair.list"));
router.post("/devices/pair/approve", rpcHandler("device.pair.approve"));
router.post("/devices/pair/reject", rpcHandler("device.pair.reject"));
router.post("/devices/token/rotate", rpcHandler("device.token.rotate"));
router.post("/devices/token/revoke", rpcHandler("device.token.revoke"));

export { router as deviceRoutes };
