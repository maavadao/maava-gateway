import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

// Usage
router.post("/usage/status", rpcHandler("usage.status"));
router.post("/usage/cost", rpcHandler("usage.cost"));

// Talk mode
router.post("/talk/mode", rpcHandler("talk.mode"));

// Voice wake
router.post("/voicewake/get", rpcHandler("voicewake.get"));
router.post("/voicewake/set", rpcHandler("voicewake.set"));

// System
router.post("/system/presence", rpcHandler("system-presence"));
router.post("/system/event", rpcHandler("system-event"));
router.post("/system/heartbeat", rpcHandler("last-heartbeat"));
router.post("/system/heartbeats", rpcHandler("set-heartbeats"));

// Update
router.post("/update/run", rpcHandler("update.run"));

// Browser
router.post("/browser/request", rpcHandler("browser.request"));

// Exec approvals
router.post("/exec/approvals/get", rpcHandler("exec.approvals.get"));
router.post("/exec/approvals/set", rpcHandler("exec.approvals.set"));
router.post("/exec/approvals/node/get", rpcHandler("exec.approvals.node.get"));
router.post("/exec/approvals/node/set", rpcHandler("exec.approvals.node.set"));
router.post("/exec/approval/request", rpcHandler("exec.approval.request"));
router.post("/exec/approval/resolve", rpcHandler("exec.approval.resolve"));

export { router as miscRoutes };
