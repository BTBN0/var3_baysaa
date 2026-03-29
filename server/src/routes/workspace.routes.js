import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { createWorkspace, getMyWorkspaces, joinWorkspace, getWorkspaceMembers, updateWorkspaceAvatar } from "../controllers/workspace.controller.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post("/", protect, createWorkspace);
router.get("/", protect, getMyWorkspaces);
router.post("/join", protect, joinWorkspace);
router.get("/:workspaceId/members", protect, getWorkspaceMembers);
router.patch("/:workspaceId/avatar", protect, upload.single("avatar"), updateWorkspaceAvatar);

export default router;