import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

// Single agent operations
router.post("/agent/run", rpcHandler("agent"));
router.post("/agent/identity", rpcHandler("agent.identity.get"));
router.post("/agent/wait", rpcHandler("agent.wait"));

// Multi-agent operations
router.post("/agents/list", rpcHandler("agents.list"));
router.post("/agents/create", rpcHandler("agents.create"));
router.post("/agents/update", rpcHandler("agents.update"));
router.post("/agents/delete", rpcHandler("agents.delete"));
router.post("/agents/files/list", rpcHandler("agents.files.list"));
router.post("/agents/files/get", rpcHandler("agents.files.get"));
router.post("/agents/files/set", rpcHandler("agents.files.set"));

export { router as agentRoutes };
