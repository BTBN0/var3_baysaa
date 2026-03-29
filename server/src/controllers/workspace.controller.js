import prisma from "../lib/prisma.js";

// POST /api/workspaces
export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ ok: false, message: "Workspace name is required" });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        members: {
          create: { userId, role: "OWNER" },
        },
      },
    });

    await prisma.channel.create({
      data: { name: "general", workspaceId: workspace.id },
    });

    res.status(201).json({ ok: true, message: "Workspace created", data: workspace });
  } catch (err) {
    next(err);
  }
};

// GET /api/workspaces
export const getMyWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });

    const workspaces = memberships.map((m) => m.workspace);

    res.json({ ok: true, message: "Workspaces fetched", data: workspaces });
  } catch (err) {
    next(err);
  }
};

// POST /api/workspaces/join
export const joinWorkspace = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    const requesterId = req.user.id;

    if (!inviteCode) {
      return res.status(400).json({ ok: false, message: "Invite code is required" });
    }

    const workspace = await prisma.workspace.findUnique({ where: { inviteCode } });

    if (!workspace) {
      return res.status(404).json({ ok: false, message: "Invalid invite code" });
    }

    // Check if banned
    const ban = await prisma.workspaceBan.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId: workspace.id } },
    });

    if (ban) {
      return res.status(403).json({ ok: false, message: "You are banned from this workspace" });
    }

    // Check if already a member
    const existing = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: requesterId, workspaceId: workspace.id } },
    });

    if (existing) {
      return res.status(409).json({ ok: false, message: "You are already a member" });
    }

    await prisma.workspaceMember.create({
      data: { userId: requesterId, workspaceId: workspace.id, role: "MEMBER" },
    });

    res.json({ ok: true, message: "Joined workspace", data: workspace });
  } catch (err) {
    next(err);
  }
};

// GET /api/workspaces/:workspaceId/members
export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, username: true, avatar: true, lastSeen: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    res.json({
      ok: true,
      message: "Members fetched",
      data: members.map((m) => ({ ...m.user, role: m.role })),
    });
  } catch (err) {
    next(err);
  }
};
// PATCH /api/workspaces/:workspaceId/avatar
export const updateWorkspaceAvatar = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member || member.role !== "OWNER") {
      return res.status(403).json({ ok: false, message: "Only owners can update workspace avatar" });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, message: "No file uploaded" });
    }

    const avatar = `/uploads/${req.file.filename}`;

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { avatar },
    });

    res.json({ ok: true, message: "Workspace avatar updated", data: workspace });
  } catch (err) {
    next(err);
  }
};