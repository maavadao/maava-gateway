import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/logs/tail", rpcHandler("logs.tail"));

export { router as logRoutes };
