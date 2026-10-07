import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/tts/status", rpcHandler("tts.status"));
router.post("/tts/providers", rpcHandler("tts.providers"));
router.post("/tts/enable", rpcHandler("tts.enable"));
router.post("/tts/disable", rpcHandler("tts.disable"));
router.post("/tts/convert", rpcHandler("tts.convert"));
router.post("/tts/set-provider", rpcHandler("tts.setProvider"));

export { router as ttsRoutes };
