import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/cron/list", rpcHandler("cron.list"));
router.post("/cron/status", rpcHandler("cron.status"));
router.post("/cron/add", rpcHandler("cron.add"));
router.post("/cron/update", rpcHandler("cron.update"));
router.post("/cron/remove", rpcHandler("cron.remove"));
router.post("/cron/run", rpcHandler("cron.run"));
router.post("/cron/runs", rpcHandler("cron.runs"));

export { router as cronRoutes };
