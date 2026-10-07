import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/channels/status", rpcHandler("channels.status"));
router.post("/channels/login", rpcHandler("channels.login"));
router.post("/channels/logout", rpcHandler("channels.logout"));

export { router as channelRoutes };
