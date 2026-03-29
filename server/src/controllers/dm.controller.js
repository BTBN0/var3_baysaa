import prisma from "../lib/prisma.js";

const messageInclude = {
  sender: { select: { id: true, username: true, avatar: true } },
  receiver: { select: { id: true, username: true, avatar: true } },
};

// GET /api/dm/conversations
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        deleted: false,
      },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
    });

    // Get unique conversation partners
    const seen = new Set();
    const conversations = [];

    for (const msg of messages) {
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;
      if (!seen.has(partner.id)) {
        seen.add(partner.id);
        conversations.push({ partner, lastMessage: msg });
      }
    }

    res.json({ ok: true, message: "Conversations fetched", data: conversations });
  } catch (err) {
    next(err);
  }
};

// GET /api/dm/:userId
export const getMessages = async (req, res, next) => {
  try {
    const myId = req.user.id;
    const { userId } = req.params;
    const { limit = 30, cursor } = req.query;

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: userId },
          { senderId: userId, receiverId: myId },
        ],
        deleted: false,
      },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    res.json({ ok: true, message: "Messages fetched", data: messages.reverse() });
  } catch (err) {
    next(err);
  }
};

// POST /api/dm/:userId
export const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { userId: receiverId } = req.params;
    const { content, fileUrl, fileType } = req.body;

    if (!content && !fileUrl) {
      return res.status(400).json({ ok: false, message: "Message must have content or a file" });
    }

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    // Check if sender is blocked by receiver
    const block = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: receiverId, blockedId: senderId } },
    });

    if (block) {
      return res.status(403).json({ ok: false, message: "You cannot send messages to this user" });
    }

    const message = await prisma.directMessage.create({
      data: {
        content: content?.trim() || "",
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        sender: { connect: { id: senderId } },
        receiver: { connect: { id: receiverId } },
      },
      include: messageInclude,
    });

    res.status(201).json({ ok: true, message: "Message sent", data: message });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/dm/:messageId
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ ok: false, message: "Message not found" });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ ok: false, message: "You can only delete your own messages" });
    }

    await prisma.directMessage.update({
      where: { id: messageId },
      data: { deleted: true },
    });

    res.json({ ok: true, message: "Message deleted", data: null });
  } catch (err) {
    next(err);
  }
};

// GET /api/dm/users/:workspaceId — list workspace members to DM
export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId, NOT: { userId } },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.json({
      ok: true,
      message: "Members fetched",
      data: members.map((m) => m.user),
    });
  } catch (err) {
    next(err);
  }
};