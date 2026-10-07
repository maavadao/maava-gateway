import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/models/list", rpcHandler("models.list"));

export { router as modelRoutes };
