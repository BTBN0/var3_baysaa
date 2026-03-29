import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { signToken } from "../config/jwt.js";

export const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ ok: false, message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      return res.status(409).json({ ok: false, message: "Email or username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword },
      select: { id: true, email: true, username: true, avatar: true, createdAt: true },
    });

    const token = signToken({ id: user.id, email: user.email, username: user.username });

    res.status(201).json({ ok: true, message: "Registered successfully", data: { token, user } });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, email: user.email, username: user.username });
    const { password: _, ...userData } = user;

    res.json({ ok: true, message: "Logged in successfully", data: { token, user: userData } });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, username: true, avatar: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    res.json({ ok: true, message: "User fetched", data: user });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    if (!username || username.trim() === "") {
      return res.status(400).json({ ok: false, message: "Username is required" });
    }

    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
    });

    if (existing) {
      return res.status(409).json({ ok: false, message: "Username already taken" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username: username.trim() },
      select: { id: true, email: true, username: true, avatar: true },
    });

    res.json({ ok: true, message: "Profile updated", data: user });
  } catch (err) {
    next(err);
  }
};

export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No file uploaded" });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
      select: { id: true, email: true, username: true, avatar: true },
    });

    res.json({ ok: true, message: "Avatar updated", data: user });
  } catch (err) {
    next(err);
  }
};
// GET /api/auth/search?q=username
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ ok: false, message: "Query must be at least 2 characters" });
    }

    const users = await prisma.user.findMany({
      where: {
        username: { contains: q.trim() },
        NOT: { id: userId },
      },
      select: { id: true, username: true, avatar: true },
      take: 10,
    });

    res.json({ ok: true, message: "Users found", data: users });
  } catch (err) {
    next(err);
  }
};