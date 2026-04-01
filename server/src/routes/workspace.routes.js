import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  createWorkspace, getMyWorkspaces, joinWorkspace,
  getWorkspaceMembers, updateWorkspaceAvatar, updateWorkspace,
  getInvitePreview,
} from "../controllers/workspace.controller.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/invite/:code",           getInvitePreview);        // public — no auth needed
router.post("/",                      protect, createWorkspace);
router.get("/",                       protect, getMyWorkspaces);
router.post("/join",                  protect, joinWorkspace);
router.get("/:workspaceId/members",   protect, getWorkspaceMembers);
router.patch("/:workspaceId/avatar",  protect, upload.single("avatar"), updateWorkspaceAvatar);
router.patch("/:workspaceId",         protect, updateWorkspace);

export default router;
