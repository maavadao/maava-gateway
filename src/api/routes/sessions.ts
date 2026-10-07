import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/sessions/list", rpcHandler("sessions.list"));
router.post("/sessions/preview", rpcHandler("sessions.preview"));
router.post("/sessions/patch", rpcHandler("sessions.patch"));
router.post("/sessions/reset", rpcHandler("sessions.reset"));
router.post("/sessions/delete", rpcHandler("sessions.delete"));
router.post("/sessions/compact", rpcHandler("sessions.compact"));

export { router as sessionRoutes };
