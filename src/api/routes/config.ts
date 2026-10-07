import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/config/get", rpcHandler("config.get"));
router.post("/config/set", rpcHandler("config.set"));
router.post("/config/apply", rpcHandler("config.apply"));
router.post("/config/patch", rpcHandler("config.patch"));
router.post("/config/schema", rpcHandler("config.schema"));

export { router as configRoutes };
