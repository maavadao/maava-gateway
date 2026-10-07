import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/messages/send", rpcHandler("send"));
router.post("/messages/wake", rpcHandler("wake"));

export { router as messageRoutes };
