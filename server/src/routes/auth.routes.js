import { Router } from "express";
import {
  register,
  login,
  me,
  updateProfile,
  updateAvatar,
  searchUsers,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.patch("/profile", protect, updateProfile);
router.post("/avatar", protect, upload.single("avatar"), updateAvatar);
router.get("/search", protect, searchUsers);

export default router;