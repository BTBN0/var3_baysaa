import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  getConversations,
  getMessages,
  sendMessage,
  deleteMessage,
  getWorkspaceMembers,
} from "../controllers/dm.controller.js";

const router = Router();

router.get("/conversations", protect, getConversations);
router.get("/users/:workspaceId", protect, getWorkspaceMembers);
router.get("/:userId", protect, getMessages);
router.post("/:userId", protect, sendMessage);
router.delete("/:messageId", protect, deleteMessage);

export default router;