import { Router } from "express";
import { rpcHandler } from "./_handler.ts";

const router = Router();

router.post("/nodes/list", rpcHandler("node.list"));
router.post("/nodes/describe", rpcHandler("node.describe"));
router.post("/nodes/invoke", rpcHandler("node.invoke"));
router.post("/nodes/rename", rpcHandler("node.rename"));
router.post("/nodes/event", rpcHandler("node.event"));

// Node pairing
router.post("/nodes/pair/request", rpcHandler("node.pair.request"));
router.post("/nodes/pair/list", rpcHandler("node.pair.list"));
router.post("/nodes/pair/approve", rpcHandler("node.pair.approve"));
router.post("/nodes/pair/reject", rpcHandler("node.pair.reject"));
router.post("/nodes/pair/verify", rpcHandler("node.pair.verify"));

export { router as nodeRoutes };
