import Chat from "../model/chat.js";
import { getIO } from "../socket/socketManager.js";
import { getUserSocketId } from "../socket/socket.js";
import Message from "../model/message.js";
import UserModel from "../model/user.schema.js";
import cloudinary from "../config/cloudinary.js";

const getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.find({
      participants: userId,
      $or: [{ isGroup: true }, { status: "accepted" }],
    })
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar",
        },
      });

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendChatRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        message: "Receiver id is required",
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        message: "You cannot send a request to yourself",
      });
    }

    const existingChat = await Chat.findOne({
      isGroup: false,
      participants: {
        $all: [senderId, receiverId],
      },
    })
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar",
        },
      });

    if (existingChat) {
      return res.status(200).json({
        success: true,
        alreadyExists: true,
        chat: existingChat,
      });
    }

    const newChat = await Chat.create({
      participants: [senderId, receiverId],
      isGroup: false,
      status: "pending",
      requestedBy: senderId,
    });

    const chat = await Chat.findById(newChat._id).populate(
      "participants",
      "-password",
    );

    const io = getIO();
    const receiverSocketId = getUserSocketId(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestReceived", {
        chat,
      });
    }

    res.status(201).json({
      success: true,
      alreadyExists: false,
      message: "Chat request sent successfully",
      chat,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await Chat.find({
      isGroup: false,
      status: "pending",
      participants: userId,
      requestedBy: { $ne: userId },
    })
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar",
        },
      });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const acceptChatRequest = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId)
      .populate("participants", "-password")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar",
        },
      });

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found",
      });
    }

    if (chat.isGroup) {
      return res.status(400).json({
        message: "Invalid chat request",
      });
    }

    if (chat.status === "accepted") {
      return res.status(400).json({
        message: "Request already accepted",
      });
    }

    if (chat.requestedBy.equals(req.user.id)) {
      return res.status(403).json({
        message: "You cannot accept your own request",
      });
    }

    const isParticipant = chat.participants.some((participant) =>
      participant._id.equals(req.user.id),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    chat.status = "accepted";
    await chat.save();

    const io = getIO();

    for (const participant of chat.participants) {
      const socketId = getUserSocketId(participant._id);

      if (socketId) {
        io.to(socketId).emit("friendRequestAccepted", {
          chat,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Chat request accepted",
      chat,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const rejectChatRequest = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found",
      });
    }

    if (chat.isGroup) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    const isParticipant = chat.participants.some((participant) =>
      participant.equals(req.user.id),
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    if (chat.requestedBy.equals(req.user.id)) {
      return res.status(403).json({
        message: "You cannot reject your own request",
      });
    }

    const senderId = chat.requestedBy.toString();

    await Chat.findByIdAndDelete(chatId);

    const io = getIO();
    const senderSocketId = getUserSocketId(senderId);

    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestRejected", {
        chatId,
      });
    }

    res.status(200).json({
      success: true,
      message: "Chat request rejected",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const createGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupName, members } = req.body;

    if (!groupName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    if (!Array.isArray(members)) {
      return res.status(400).json({
        success: false,
        message: "Members must be an array",
      });
    }

    const uniqueMembers = [...new Set(members.map((id) => id.toString()))];

    const filteredMembers = uniqueMembers.filter(
      (id) => id !== userId.toString(),
    );

    if (filteredMembers.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Select at least 1 other members to create a group",
      });
    }

    const users = await UserModel.find({
      _id: {
        $in: filteredMembers,
      },
    }).select("_id");

    if (users.length !== filteredMembers.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected users do not exist",
      });
    }

    const participants = [userId, ...filteredMembers];

    const unreadCount = {};

    participants.forEach((id) => {
      unreadCount[id.toString()] = 0;
    });

    const group = await Chat.create({
      participants,
      isGroup: true,
      groupName: groupName.trim(),
      groupAdmin: userId,
      status: "accepted",
      requestedBy: null,
      unreadCount,
    });

    const populatedGroup = await Chat.findById(group._id)
      .populate("participants", "_id name email profilePic")
      .populate("groupAdmin", "_id name email profilePic")
      .populate("lastMessage");

    participants.forEach((participantId) => {
      const socketId = getUserSocketId(participantId.toString());

      if (socketId) {
        getIO().to(socketId).emit("groupCreated", populatedGroup);
      }
    });

    return res.status(201).json({
      success: true,
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Create group error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const addMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.body;
    const userId = req.user.id;

    if (!groupId || !memberId) {
      return res.status(400).json({
        success: false,
        message: "Group ID and member ID are required",
      });
    }

    const group = await Chat.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (group.groupAdmin?.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group admin can add members",
      });
    }

    const userExists = await UserModel.findById(memberId);

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const alreadyMember = group.participants.some(
      (id) => id.toString() === memberId.toString(),
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a member",
      });
    }

    group.participants.push(memberId);

    group.unreadCount.set(memberId.toString(), 0);

    await group.save();

    const updatedGroup = await Chat.findById(groupId)
      .populate("participants", "-password")
      .populate("groupAdmin", "-password")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar",
        },
      });

    const io = getIO();

    updatedGroup.participants.forEach((participant) => {
      const socketId = getUserSocketId(participant._id);

      if (socketId) {
        io.to(socketId).emit("groupUpdated", updatedGroup);
      }
    });

    return res.status(200).json({
      success: true,
      group: updatedGroup,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.body;
    const userId = req.user.id;

    const group = await Chat.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (group.groupAdmin?.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group admin can remove members",
      });
    }

    if (memberId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message:
          "Admin cannot remove themselves. Transfer admin or delete the group.",
      });
    }

    const isMember = group.participants.some(
      (id) => id.toString() === memberId.toString(),
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a group member",
      });
    }

    group.participants = group.participants.filter(
      (id) => id.toString() !== memberId.toString(),
    );

    group.unreadCount.delete(memberId.toString());

    await group.save();

    const updatedGroup = await Chat.findById(groupId)
      .populate("participants", "-password")
      .populate("groupAdmin", "-password")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar",
        },
      });

    const io = getIO();

    const removedSocketId = getUserSocketId(memberId);

    if (removedSocketId) {
      io.to(removedSocketId).emit("removedFromGroup", {
        groupId,
      });
    }

    updatedGroup.participants.forEach((participant) => {
      const socketId = getUserSocketId(participant._id);

      if (socketId) {
        io.to(socketId).emit("groupUpdated", updatedGroup);
      }
    });

    return res.status(200).json({
      success: true,
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Remove member error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.id;

    const group = await Chat.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = group.participants.some(
      (participant) => participant.toString() === userId.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    const adminId = group.groupAdmin?.toString();

    if (adminId === userId.toString() && group.participants.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Transfer admin rights before leaving the group",
      });
    }

    group.participants = group.participants.filter(
      (participant) => participant.toString() !== userId.toString(),
    );

    if (adminId === userId.toString() && group.participants.length === 0) {
      await Chat.findByIdAndDelete(groupId);

      await Message.deleteMany({
        chatId: groupId,
      });

      const io = getIO();

      const userSocketId = getUserSocketId(userId);

      if (userSocketId) {
        io.to(userSocketId).emit("groupDeleted", {
          groupId,
        });
      }

      return res.status(200).json({
        success: true,
        deleted: true,
        groupId,
      });
    }

    await group.save();

    const updatedGroup = await Chat.findById(groupId)
      .populate("participants", "username email avatar")
      .populate("groupAdmin", "username email avatar");

    const io = getIO();

    io.to(groupId.toString()).emit("groupUpdated", updatedGroup);

    const leavingUserSocket = getUserSocketId(userId);

    if (leavingUserSocket) {
      io.to(leavingUserSocket).emit("groupLeft", {
        groupId: groupId.toString(),
      });
    }

    return res.status(200).json({
      success: true,
      group: updatedGroup,
      groupId,
    });
  } catch (error) {
    console.error("Leave group error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Chat.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const adminId =
      group.groupAdmin?._id?.toString() || group.groupAdmin?.toString();

    if (adminId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can delete this group",
      });
    }

    const participantIds = group.participants.map(
      (participant) => participant?._id?.toString() || participant.toString(),
    );

    await Message.deleteMany({
      chatId: group._id,
    });

    await Chat.findByIdAndDelete(group._id);

    const io = getIO();

    const payload = {
      groupId: group._id.toString(),
    };

    participantIds.forEach((participantId) => {
      const socketId = getUserSocketId(participantId);

      if (socketId) {
        io.to(socketId).emit("groupDeleted", payload);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Group deleted successfully",
      groupId: group._id.toString(),
    });
  } catch (error) {
    console.error("Delete group error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const transferAdmin = async (req, res) => {
  try {
    const { groupId, newAdminId } = req.body;

    const currentUserId = req.user.id;

    if (!groupId || !newAdminId) {
      return res.status(400).json({
        success: false,
        message: "Group ID and new admin ID are required",
      });
    }

    const group = await Chat.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!group.isGroup) {
      return res.status(400).json({
        success: false,
        message: "This is not a group chat",
      });
    }

    if (group.groupAdmin?.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can transfer admin rights",
      });
    }

    const isMember = group.participants.some(
      (participant) => participant.toString() === newAdminId.toString(),
    );

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "New admin must be a group member",
      });
    }

    if (newAdminId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You are already the group admin",
      });
    }

    group.groupAdmin = newAdminId;

    await group.save();

    const updatedGroup = await Chat.findById(groupId)
      .populate("participants", "username email avatar")
      .populate("groupAdmin", "username email avatar")
      .populate("lastMessage");

    return res.status(200).json({
      success: true,
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Transfer admin error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const userId = req.user.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        message: "Chat not found",
      });
    }

    if (!chat.participants.some((id) => id.toString() === userId)) {
      return res.status(403).json({
        message: "Unauthorized",
      });
    }

    await Message.deleteMany({
      chatId,
    });

    chat.lastMessage = null;
    chat.unreadCount = new Map();

    await chat.save();

    const io = getIO();

    const participants = [...chat.participants];

    participants.forEach((participant) => {
      const socketId = getUserSocketId(participant.toString());

      if (socketId) {
        io.to(socketId).emit("conversationCleared", {
          chatId,
        });
      }
    });

    return res.json({
      success: true,
      message: "Conversation cleared successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const updateGroupPhoto = async (req, res) => {
  try {
    const { groupId } = req.body;

    const userId = req.user.id;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Group photo is required",
      });
    }

    const group = await Chat.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!group.isGroup) {
      return res.status(400).json({
        success: false,
        message: "This is not a group",
      });
    }

    if (group.groupAdmin?.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the group admin can change the group photo",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "chat-app/group-photos",
    });

    group.groupPhoto = result.secure_url;

    await group.save();

    const updatedGroup = await Chat.findById(groupId)
      .populate("participants", "username email avatar")
      .populate("groupAdmin", "username email avatar")
      .populate("lastMessage");

    return res.status(200).json({
      success: true,
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Update group photo error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateGroupName = async (req, res) => {
  try {
    const { groupId, groupName } = req.body;

    const userId = req.user.id;

    if (!groupId || !groupName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group ID and group name are required",
      });
    }

    const trimmedName = groupName.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Group name must be at least 2 characters",
      });
    }

    if (trimmedName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Group name cannot exceed 50 characters",
      });
    }

    const group = await Chat.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const adminId =
      group.groupAdmin?._id?.toString() || group.groupAdmin?.toString();

    if (adminId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group admin can change the group name",
      });
    }

    group.groupName = trimmedName;

    await group.save();

    await group.populate("participants", "username email avatar");

    await group.populate("groupAdmin", "username email avatar");

    const io = getIO();

    const payload = {
      groupId: group._id.toString(),

      groupName: group.groupName,
    };

    group.participants.forEach((participant) => {
      const participantId = participant._id.toString();

      const socketId = getUserSocketId(participantId);

      if (socketId) {
        io.to(socketId).emit("groupNameUpdated", payload);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Group name updated successfully",
      group,
    });
  } catch (error) {
    console.error("Update group name error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateGroupBio = async (req, res) => {
  try {
    const { groupId, groupBio } = req.body;

    const userId = req.user.id;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
      });
    }

    if (typeof groupBio !== "string") {
      return res.status(400).json({
        success: false,
        message: "Group bio must be text",
      });
    }

    const trimmedBio = groupBio.trim();

    if (trimmedBio.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Group bio cannot exceed 500 characters",
      });
    }

    const group = await Chat.findById(groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const adminId =
      group.groupAdmin?._id?.toString() || group.groupAdmin?.toString();

    if (adminId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only group admin can change the group bio",
      });
    }

    group.groupBio = trimmedBio;

    await group.save();

    const updatedGroup = await Chat.findById(groupId)
      .populate("participants", "username email avatar")
      .populate("groupAdmin", "username email avatar")
      .populate("lastMessage");

    const io = getIO();

    const payload = {
      groupId: group._id.toString(),

      groupBio: group.groupBio,
    };

    updatedGroup.participants.forEach((participant) => {
      const participantId = participant._id.toString();

      const socketId = getUserSocketId(participantId);

      if (socketId) {
        io.to(socketId).emit("groupBioUpdated", payload);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Group bio updated successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Update group bio error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getChats,
  sendChatRequest,
  getPendingRequests,
  acceptChatRequest,
  rejectChatRequest,
  createGroup,
  addMember,
  removeMember,
  leaveGroup,
  deleteGroup,
  transferAdmin,
  deleteConversation,
  updateGroupPhoto,
  updateGroupName,
  updateGroupBio,
};
