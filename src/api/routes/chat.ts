import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/chat/history", rpcHandler("chat.history"));
router.post("/chat/send", rpcHandler("chat.send"));
router.post("/chat/abort", rpcHandler("chat.abort"));

export { router as chatRoutes };
