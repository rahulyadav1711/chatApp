import Message from "../model/message.js";
import cloudinary from "../config/cloudinary.js";
import Chat from "../model/chat.js";
import UserModel from "../model/user.schema.js";

import { getUserSocketId, getActiveChat } from "../socket/socket.js";

import { getIO } from "../socket/socketManager.js";

const sendMessage = async (req, res) => {
  try {
    const sender = req.user.id;

    const { receiverId, text, replyTo } = req.body;

    const receiverUser = await UserModel.findById(receiverId);

    if (!receiverUser) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    if (
      receiverUser.blockedUsers?.some(
        (id) => id.toString() === sender.toString(),
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "You are blocked",
      });
    }

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);

      if (!replyMessage) {
        return res.status(404).json({
          success: false,
          message: "Original message not found",
        });
      }

      const belongsToConversation =
        (replyMessage.sender.toString() === sender.toString() &&
          replyMessage.receiver.toString() === receiverId.toString()) ||
        (replyMessage.sender.toString() === receiverId.toString() &&
          replyMessage.receiver.toString() === sender.toString());

      if (!belongsToConversation) {
        return res.status(403).json({
          success: false,
          message: "Cannot reply to this message",
        });
      }
    }

    const senderSocketId = getUserSocketId(sender);

    const receiverSocketId = getUserSocketId(receiverId);

    const initialStatus = receiverSocketId ? "delivered" : "sent";

    console.log("======================================");
    console.log("SEND MESSAGE");
    console.log("Sender:", sender.toString());
    console.log("Sender Socket:", senderSocketId);
    console.log("Receiver:", receiverId.toString());
    console.log("Receiver Socket:", receiverSocketId);
    console.log("Initial Status:", initialStatus);
    console.log("======================================");

    let chat = await Chat.findOne({
      isGroup: false,

      participants: {
        $all: [sender, receiverId],
      },
    });

    if (!chat) {
      let message = await Message.create({
        sender,

        receiver: receiverId,

        text: text.trim(),

        status: initialStatus,

        replyTo: replyTo || null,
      });

      chat = await Chat.create({
        participants: [sender, receiverId],

        requestedBy: sender,

        status: "pending",

        lastMessage: message._id,
      });

      message.chatId = chat._id;

      await message.save();

      message = await Message.findById(message._id)
        .populate("sender", "_id username avatar")
        .populate({
          path: "replyTo",

          select: "text image audio sender isDeleted",

          populate: {
            path: "sender",

            select: "_id username avatar",
          },
        });

      if (receiverSocketId) {
        getIO().to(receiverSocketId).emit("receiveMessage", message);

        getIO().to(receiverSocketId).emit("unreadUpdated", {
          chatId: chat._id,

          count: 1,
        });
      }

      if (senderSocketId) {
        getIO().to(senderSocketId).emit("receiveMessage", message);
      }

      return res.status(201).json({
        success: true,

        requestSent: true,

        message: "Chat request sent successfully.",

        data: message,
      });
    }

    if (chat.status === "pending") {
      if (!chat.requestedBy.equals(sender)) {
        return res.status(403).json({
          success: false,

          pending: true,

          message: "Accept the chat request before sending messages.",
        });
      }

      return res.status(403).json({
        success: false,

        pending: true,

        message: "Wait until the user accepts the request.",
      });
    }

    let message = await Message.create({
      sender,

      receiver: receiverId,

      text: text.trim(),

      chatId: chat._id,

      replyTo: replyTo || null,

      status: initialStatus,
    });

    chat.lastMessage = message._id;

    const activeChatId = [sender.toString(), receiverId.toString()]
      .sort()
      .join("_");

    const receiverActiveChat = getActiveChat(receiverId);

    if (receiverActiveChat !== activeChatId) {
      const currentUnread = chat.unreadCount.get(receiverId.toString()) || 0;

      chat.unreadCount.set(
        receiverId.toString(),

        currentUnread + 1,
      );
    }

    await chat.save();

    message = await Message.findById(message._id)
      .populate("sender", "_id username avatar")
      .populate({
        path: "replyTo",

        select: "text image audio sender isDeleted",

        populate: {
          path: "sender",

          select: "_id username avatar",
        },
      });

    if (senderSocketId) {
      getIO().to(senderSocketId).emit("receiveMessage", message);
    }

    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("receiveMessage", message);

      getIO()
        .to(receiverSocketId)
        .emit("unreadUpdated", {
          chatId: chat._id,

          count: chat.unreadCount.get(receiverId.toString()) || 0,
        });
    }

    return res.status(201).json(message);
  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      success: false,

      error: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const messages = await Message.find({
      $and: [
        {
          $or: [
            {
              sender: senderId,

              receiver: receiverId,
            },

            {
              sender: receiverId,

              receiver: senderId,
            },
          ],
        },

        {
          deletedFor: {
            $ne: req.user.id,
          },
        },
      ],
    })
      .populate({
        path: "replyTo",

        select: "text image audio sender isDeleted",
      })
      .sort({
        createdAt: 1,
      });

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Get messages error:", error);

    return res.status(500).json({
      success: false,

      error: error.message,
    });
  }
};

const markAsSeen = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,

        message: "Message not found",
      });
    }

    if (message.receiver.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,

        message: "Unauthorized",
      });
    }

    if (message.status !== "seen") {
      message.status = "seen";

      await message.save();

      const senderSocketId = getUserSocketId(message.sender);

      if (senderSocketId) {
        getIO().to(senderSocketId).emit("messageSeenUpdate", {
          messageId: message._id.toString(),

          status: "seen",
        });
      }
    }

    return res.status(200).json({
      success: true,

      message: message,
    });
  } catch (error) {
    console.error("Mark as seen error:", error);

    return res.status(500).json({
      success: false,

      message: "Internal Server Error",
    });
  }
};

const sendImage = async (req, res) => {
  try {
    const senderId = req.user.id;

    const { receiverId, chatId, caption, replyTo } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,

        message: "Image is required",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "chat-images",

      resource_type: "image",
    });

    if (chatId) {
      const chat = await Chat.findById(chatId);

      if (!chat) {
        return res.status(404).json({
          success: false,

          message: "Group not found",
        });
      }

      if (!chat.isGroup) {
        return res.status(400).json({
          success: false,

          message: "Invalid group chat",
        });
      }

      const isMember = chat.participants.some(
        (participant) => participant.toString() === senderId.toString(),
      );

      if (!isMember) {
        return res.status(403).json({
          success: false,

          message: "You are not a member of this group",
        });
      }

      if (replyTo) {
        const repliedMessage = await Message.findById(replyTo);

        if (!repliedMessage) {
          return res.status(404).json({
            success: false,

            message: "Original message not found",
          });
        }

        if (repliedMessage.chatId?.toString() !== chat._id.toString()) {
          return res.status(403).json({
            success: false,

            message: "Cannot reply to this message",
          });
        }
      }

      let message = await Message.create({
        sender: senderId,

        receiver: null,

        chatId: chat._id,

        image: result.secure_url,

        text: caption?.trim() || "",

        replyTo: replyTo || null,

        status: "sent",
      });

      chat.lastMessage = message._id;

      for (const participant of chat.participants) {
        const participantId = participant.toString();

        if (participantId === senderId.toString()) {
          continue;
        }

        const currentUnread = chat.unreadCount.get(participantId) || 0;

        chat.unreadCount.set(
          participantId,

          currentUnread + 1,
        );
      }

      await chat.save();

      message = await Message.findById(message._id)
        .populate("sender", "_id username avatar")
        .populate({
          path: "replyTo",

          select: "text image audio sender isDeleted",

          populate: {
            path: "sender",

            select: "_id username avatar",
          },
        });

      for (const participant of chat.participants) {
        const participantId = participant.toString();

        const socketId = getUserSocketId(participantId);

        if (!socketId) {
          continue;
        }

        getIO().to(socketId).emit("receiveGroupMessage", message);

        if (participantId !== senderId.toString()) {
          getIO()
            .to(socketId)
            .emit("unreadUpdated", {
              chatId: chat._id,

              count: chat.unreadCount.get(participantId) || 0,
            });
        }
      }

      return res.status(201).json(message);
    }

    if (!receiverId) {
      return res.status(400).json({
        success: false,

        message: "Receiver ID is required",
      });
    }

    const chat = await Chat.findOne({
      isGroup: false,

      participants: {
        $all: [senderId, receiverId],
      },

      status: "accepted",
    });

    if (!chat) {
      return res.status(404).json({
        success: false,

        message: "Accepted conversation not found",
      });
    }

    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo);

      if (!repliedMessage) {
        return res.status(404).json({
          success: false,

          message: "Original message not found",
        });
      }

      if (repliedMessage.chatId?.toString() !== chat._id.toString()) {
        return res.status(403).json({
          success: false,

          message: "Cannot reply to this message",
        });
      }
    }

    const receiverSocketId = getUserSocketId(receiverId);

    const initialStatus = receiverSocketId ? "delivered" : "sent";

    let message = await Message.create({
      sender: senderId,

      receiver: receiverId,

      chatId: chat._id,

      image: result.secure_url,

      text: caption?.trim() || "",

      replyTo: replyTo || null,

      status: initialStatus,
    });

    chat.lastMessage = message._id;

    const activeChatId = [senderId.toString(), receiverId.toString()]
      .sort()
      .join("_");

    const receiverActiveChat = getActiveChat(receiverId);

    if (receiverActiveChat !== activeChatId) {
      const currentUnread = chat.unreadCount.get(receiverId.toString()) || 0;

      chat.unreadCount.set(
        receiverId.toString(),

        currentUnread + 1,
      );
    }

    await chat.save();

    message = await Message.findById(message._id)
      .populate("sender", "_id username avatar")
      .populate({
        path: "replyTo",

        select: "text image audio sender isDeleted",

        populate: {
          path: "sender",

          select: "_id username avatar",
        },
      });

    const senderSocketId = getUserSocketId(senderId);

    if (senderSocketId) {
      getIO().to(senderSocketId).emit("receiveMessage", message);
    }

    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("receiveMessage", message);

      getIO()
        .to(receiverSocketId)
        .emit("unreadUpdated", {
          chatId: chat._id,

          count: chat.unreadCount.get(receiverId.toString()) || 0,
        });
    }

    return res.status(201).json(message);
  } catch (error) {
    console.error("Send image error:", error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,

        message: "Message not found",
      });
    }

    const senderId =
      message.sender?._id?.toString() || message.sender?.toString();

    if (senderId !== userId.toString()) {
      return res.status(403).json({
        success: false,

        message: "You can only delete your own message",
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        success: false,

        message: "Message already deleted",
      });
    }

    const chatId = message.chatId?.toString() || null;

    const receiverId =
      message.receiver?._id?.toString() || message.receiver?.toString() || null;

    message.isDeleted = true;

    message.text = "";

    message.image = null;

    message.audio = null;

    message.file = null;

    message.fileName = null;

    message.fileType = null;

    message.fileSize = null;

    message.reactions = [];

    await message.save();

    await Message.updateMany(
      {
        replyTo: message._id,
      },
      {
        $set: {
          replyToDeleted: true,
        },
      },
    );

    const io = getIO();

    const payload = {
      messageId: message._id.toString(),

      chatId,
    };

    if (chatId && !receiverId) {
      io.to(chatId).emit("messageDeleted", payload);
    } else if (receiverId) {
      const senderSocketId = getUserSocketId(senderId);

      const receiverSocketId = getUserSocketId(receiverId);

      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeleted", payload);
      }

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", payload);
      }
    }

    return res.status(200).json({
      success: true,

      message: "Message deleted successfully",

      messageId: message._id,
    });
  } catch (error) {
    console.error("Delete message error:", error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const deleteForMe = async (req, res) => {
  try {
    const { messageId } = req.params;

    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,

        message: "Message not found",
      });
    }

    const isPrivateParticipant =
      message.sender?.toString() === userId.toString() ||
      message.receiver?.toString() === userId.toString();

    let isGroupParticipant = false;

    if (message.chatId) {
      const chat = await Chat.findById(message.chatId);

      if (chat?.isGroup) {
        isGroupParticipant = chat.participants.some(
          (participant) => participant.toString() === userId.toString(),
        );
      }
    }

    if (!isPrivateParticipant && !isGroupParticipant) {
      return res.status(403).json({
        success: false,

        message: "You cannot delete this message",
      });
    }

    const alreadyDeleted = message.deletedFor?.some(
      (id) => id.toString() === userId.toString(),
    );

    if (!alreadyDeleted) {
      message.deletedFor.push(userId);

      await message.save();
    }

    const io = getIO();

    const socketId = getUserSocketId(userId);

    if (socketId) {
      io.to(socketId).emit("messageDeletedForMe", {
        messageId: message._id.toString(),

        chatId: message.chatId?.toString() || null,
      });
    }

    return res.status(200).json({
      success: true,

      message: "Message deleted for you",

      messageId: message._id,
    });
  } catch (error) {
    console.error("Delete for me error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to delete message",

      error: error.message,
    });
  }
};

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const { text } = req.body;

    const userId = req.user.id;

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,

        message: "Message cannot be empty",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,

        message: "Message not found",
      });
    }

    if (message.sender?.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,

        message: "You can only edit your own message",
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        success: false,

        message: "Deleted messages cannot be edited",
      });
    }

    const EDIT_TIME_LIMIT = 15 * 60 * 1000;

    const createdAt = new Date(message.createdAt).getTime();

    if (Date.now() - createdAt > EDIT_TIME_LIMIT) {
      return res.status(403).json({
        success: false,

        message: "Message can only be edited within 15 minutes",
      });
    }

    message.text = text.trim();

    message.isEdited = true;

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "username avatar email")
      .populate({
        path: "replyTo",

        populate: {
          path: "sender",

          select: "username avatar",
        },
      })
      .populate("reactions.user", "username avatar");

    const io = getIO();

    if (message.chatId) {
      io.to(message.chatId.toString()).emit("messageEdited", updatedMessage);
    } else {
      const receiverSocketId = getUserSocketId(message.receiver);

      const senderSocketId = getUserSocketId(message.sender);

      if (senderSocketId) {
        io.to(senderSocketId).emit("messageEdited", updatedMessage);
      }

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageEdited", updatedMessage);
      }
    }

    return res.status(200).json({
      success: true,

      message: updatedMessage,
    });
  } catch (error) {
    console.error("Edit message error:", error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const sendVoice = async (req, res) => {
  try {
    const senderId = req.user.id;

    const { receiverId, chatId, replyTo } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,

        message: "Audio file is required",
      });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",

      folder: "chat-voice",
    });

    if (chatId) {
      const chat = await Chat.findById(chatId);

      if (!chat) {
        return res.status(404).json({
          success: false,

          message: "Group not found",
        });
      }

      if (!chat.isGroup) {
        return res.status(400).json({
          success: false,

          message: "Invalid group chat",
        });
      }

      const isMember = chat.participants.some(
        (participant) => participant.toString() === senderId.toString(),
      );

      if (!isMember) {
        return res.status(403).json({
          success: false,

          message: "You are not a member of this group",
        });
      }

      let message = await Message.create({
        sender: senderId,

        receiver: null,

        chatId: chat._id,

        audio: result.secure_url,

        replyTo: replyTo || null,

        status: "sent",
      });

      chat.lastMessage = message._id;

      await chat.save();

      message = await Message.findById(message._id)
        .populate("sender", "_id username avatar")
        .populate({
          path: "replyTo",

          select: "text image audio sender isDeleted",

          populate: {
            path: "sender",

            select: "_id username avatar",
          },
        });

      for (const participant of chat.participants) {
        const socketId = getUserSocketId(participant.toString());

        if (!socketId) {
          continue;
        }

        getIO().to(socketId).emit("receiveGroupMessage", message);
      }

      return res.status(201).json(message);
    }

    if (!receiverId) {
      return res.status(400).json({
        success: false,

        message: "Receiver ID is required",
      });
    }

    const chat = await Chat.findOne({
      isGroup: false,

      participants: {
        $all: [senderId, receiverId],
      },

      status: "accepted",
    });

    if (!chat) {
      return res.status(404).json({
        success: false,

        message: "Accepted conversation not found",
      });
    }

    const receiverSocketId = getUserSocketId(receiverId);

    const initialStatus = receiverSocketId ? "delivered" : "sent";

    let message = await Message.create({
      sender: senderId,

      receiver: receiverId,

      chatId: chat._id,

      audio: result.secure_url,

      replyTo: replyTo || null,

      status: initialStatus,
    });

    chat.lastMessage = message._id;

    const activeChatId = [senderId.toString(), receiverId.toString()]
      .sort()
      .join("_");

    const receiverActiveChat = getActiveChat(receiverId);

    if (receiverActiveChat !== activeChatId) {
      const currentUnread = chat.unreadCount.get(receiverId.toString()) || 0;

      chat.unreadCount.set(
        receiverId.toString(),

        currentUnread + 1,
      );
    }

    await chat.save();

    message = await Message.findById(message._id)
      .populate("sender", "_id username avatar")
      .populate({
        path: "replyTo",

        select: "text image audio sender isDeleted",

        populate: {
          path: "sender",

          select: "_id username avatar",
        },
      });

    const senderSocketId = getUserSocketId(senderId);

    if (senderSocketId) {
      getIO().to(senderSocketId).emit("receiveMessage", message);
    }

    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("receiveMessage", message);

      getIO()
        .to(receiverSocketId)
        .emit("unreadUpdated", {
          chatId: chat._id,

          count: chat.unreadCount.get(receiverId.toString()) || 0,
        });
    }

    return res.status(201).json(message);
  } catch (error) {
    console.error("Send voice error:", error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const resetUnreadCount = async (req, res) => {
  try {
    const { chatId } = req.params;

    const userId = req.user.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,

        message: "Chat not found",
      });
    }

    chat.unreadCount.set(userId.toString(), 0);

    await chat.save();

    const socketId = getUserSocketId(userId);

    if (socketId) {
      getIO().to(socketId).emit("unreadUpdated", {
        chatId,

        count: 0,
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Reset unread count error:", error);

    return res.status(500).json({
      success: false,

      error: error.message,
    });
  }
};

const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const { emoji } = req.body;

    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({
        success: false,

        message: "Emoji is required",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,

        message: "Message not found",
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        success: false,

        message: "Cannot react to deleted message",
      });
    }

    const senderId =
      message.sender?._id?.toString() || message.sender?.toString();

    const receiverId =
      message.receiver?._id?.toString() || message.receiver?.toString() || null;

    const chatId = message.chatId?.toString() || null;

    const isGroupMessage = !receiverId;

    if (isGroupMessage) {
      if (!chatId) {
        return res.status(400).json({
          success: false,

          message: "Group chat not found",
        });
      }

      const chat = await Chat.findById(chatId);

      if (!chat) {
        return res.status(404).json({
          success: false,

          message: "Chat not found",
        });
      }

      const isMember = chat.participants.some(
        (participant) => participant.toString() === userId.toString(),
      );

      if (!isMember) {
        return res.status(403).json({
          success: false,

          message: "You are not a member of this group",
        });
      }
    } else {
      const allowed =
        senderId === userId.toString() || receiverId === userId.toString();

      if (!allowed) {
        return res.status(403).json({
          success: false,

          message: "You cannot react to this message",
        });
      }
    }

    const existingReactionIndex = message.reactions.findIndex((reaction) => {
      const reactionUserId =
        reaction.user?._id?.toString() || reaction.user?.toString();

      return reactionUserId === userId.toString();
    });

    if (existingReactionIndex !== -1) {
      const existingReaction = message.reactions[existingReactionIndex];

      if (existingReaction.emoji === emoji) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({
        user: userId,

        emoji,
      });
    }

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "username avatar email")
      .populate("reactions.user", "username avatar")
      .populate({
        path: "replyTo",

        populate: {
          path: "sender",

          select: "username avatar",
        },
      });

    const io = getIO();

    if (isGroupMessage) {
      io.to(chatId).emit("messageReactionUpdated", updatedMessage);
    } else {
      const senderSocketId = getUserSocketId(senderId);

      const receiverSocketId = getUserSocketId(receiverId);

      if (senderSocketId) {
        io.to(senderSocketId).emit("messageReactionUpdated", updatedMessage);
      }

      if (receiverSocketId && receiverSocketId !== senderSocketId) {
        io.to(receiverSocketId).emit("messageReactionUpdated", updatedMessage);
      }
    }

    return res.status(200).json({
      success: true,

      message: updatedMessage,
    });
  } catch (error) {
    console.error("React message error:", error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

const sendGroupMessage = async (req, res) => {
  try {
    const senderId = req.user.id;

    const { chatId, text, replyTo } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: "Group chat ID is required",
      });
    }

    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!chat.isGroup) {
      return res.status(400).json({
        success: false,
        message: "This is not a group chat",
      });
    }

    const isMember = chat.participants.some(
      (participant) => participant.toString() === senderId.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo);

      if (!repliedMessage) {
        return res.status(404).json({
          success: false,
          message: "Original message not found",
        });
      }

      if (repliedMessage.chatId?.toString() !== chat._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Cannot reply to this message",
        });
      }
    }

    let message = await Message.create({
      sender: senderId,

      receiver: null,

      chatId: chat._id,

      text: text.trim(),

      replyTo: replyTo || null,

      status: "sent",
    });

    chat.lastMessage = message._id;

    for (const participant of chat.participants) {
      const participantId = participant.toString();

      if (participantId === senderId.toString()) {
        continue;
      }

      const currentUnread = chat.unreadCount.get(participantId) || 0;

      chat.unreadCount.set(participantId, currentUnread + 1);
    }

    await chat.save();

    message = await Message.findById(message._id)
      .populate("sender", "_id username avatar")
      .populate({
        path: "replyTo",

        select: "text image audio sender isDeleted",

        populate: {
          path: "sender",

          select: "_id username avatar",
        },
      });

    for (const participant of chat.participants) {
      const participantId = participant.toString();

      const socketId = getUserSocketId(participantId);

      if (!socketId) {
        continue;
      }

      getIO().to(socketId).emit("receiveGroupMessage", message);

      if (participantId !== senderId.toString()) {
        getIO()
          .to(socketId)
          .emit("unreadUpdated", {
            chatId: chat._id,

            count: chat.unreadCount.get(participantId) || 0,
          });
      }
    }

    return res.status(201).json(message);
  } catch (error) {
    console.error("Send group message error:", error);

    return res.status(500).json({
      success: false,

      error: error.message,
    });
  }
};

const getGroupMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const userId = req.user.id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,

        message: "Group not found",
      });
    }

    if (!chat.isGroup) {
      return res.status(400).json({
        success: false,

        message: "This is not a group chat",
      });
    }

    const isMember = chat.participants.some(
      (participant) => participant.toString() === userId.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,

        message: "You are not a member of this group",
      });
    }

    const messages = await Message.find({
      chatId: chat._id,

      deletedFor: {
        $ne: userId,
      },
    })
      .populate("sender", "_id username avatar")
      .populate({
        path: "replyTo",

        select: "text image audio sender isDeleted",

        populate: {
          path: "sender",

          select: "_id username avatar",
        },
      })
      .populate("reactions.user", "_id username avatar")
      .sort({
        createdAt: 1,
      });

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Get group messages error:", error);

    return res.status(500).json({
      success: false,

      error: error.message,
    });
  }
};

const sendFile = async (req, res) => {
  try {
    const senderId = req.user.id;

    const { receiverId, chatId, replyTo } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,

        message: "File is required",
      });
    }

    const fileName = req.file.originalname;

    const fileType = req.file.mimetype;

    const fileSize = req.file.size;

    console.log("======================================");

    console.log("SEND FILE");

    console.log("File Name:", fileName);

    console.log("File Type:", fileType);

    console.log("File Size:", fileSize);

    console.log("File Size MB:", (fileSize / (1024 * 1024)).toFixed(2));

    console.log("======================================");

    let resourceType = "raw";

    if (fileType.startsWith("image/")) {
      resourceType = "image";
    } else if (fileType.startsWith("video/")) {
      resourceType = "video";
    } else if (fileType.startsWith("audio/")) {
      resourceType = "video";
    }

    console.log("Cloudinary Resource Type:", resourceType);

    let result;

    const CLOUDINARY_CHUNK_LIMIT = 100 * 1024 * 1024;

    if (fileSize <= CLOUDINARY_CHUNK_LIMIT) {
      console.log("Cloudinary normal upload");

      result = await cloudinary.uploader.upload(req.file.path, {
        folder: "chat-files",

        resource_type: resourceType,
      });
    } else {
      console.log("Cloudinary chunked upload");

      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_large(req.file.path, {
          folder: "chat-files",

          resource_type: resourceType,

          chunk_size: 20 * 1024 * 1024,
        });

        uploadStream.on("end", (uploadResult) => {
          resolve(uploadResult);
        });

        uploadStream.on("error", (error) => {
          reject(error);
        });
      });
    }

    console.log("Cloudinary upload successful");

    console.log("Cloudinary URL:", result.secure_url);

    if (chatId) {
      const chat = await Chat.findById(chatId);

      if (!chat) {
        return res.status(404).json({
          success: false,

          message: "Group not found",
        });
      }

      if (!chat.isGroup) {
        return res.status(400).json({
          success: false,

          message: "Invalid group chat",
        });
      }

      const isMember = chat.participants.some(
        (participant) => participant.toString() === senderId.toString(),
      );

      if (!isMember) {
        return res.status(403).json({
          success: false,

          message: "You are not a member of this group",
        });
      }

      if (replyTo) {
        const repliedMessage = await Message.findById(replyTo);

        if (!repliedMessage) {
          return res.status(404).json({
            success: false,

            message: "Original message not found",
          });
        }

        if (repliedMessage.chatId?.toString() !== chat._id.toString()) {
          return res.status(403).json({
            success: false,

            message: "Cannot reply to this message",
          });
        }
      }

      let message = await Message.create({
        sender: senderId,

        receiver: null,

        chatId: chat._id,

        fileUrl: result.secure_url,

        fileName: fileName,

        fileType: fileType,

        fileSize: fileSize,

        replyTo: replyTo || null,

        status: "sent",
      });

      chat.lastMessage = message._id;

      for (const participant of chat.participants) {
        const participantId = participant.toString();

        if (participantId === senderId.toString()) {
          continue;
        }

        const currentUnread = chat.unreadCount.get(participantId) || 0;

        chat.unreadCount.set(
          participantId,

          currentUnread + 1,
        );
      }

      await chat.save();

      message = await Message.findById(message._id)
        .populate("sender", "_id username avatar")
        .populate({
          path: "replyTo",

          select:
            "text image audio fileUrl fileName fileType fileSize sender isDeleted",

          populate: {
            path: "sender",

            select: "_id username avatar",
          },
        });

      for (const participant of chat.participants) {
        const participantId = participant.toString();

        const socketId = getUserSocketId(participantId);

        if (!socketId) {
          continue;
        }

        getIO().to(socketId).emit("receiveGroupMessage", message);

        if (participantId !== senderId.toString()) {
          getIO()
            .to(socketId)
            .emit("unreadUpdated", {
              chatId: chat._id,

              count: chat.unreadCount.get(participantId) || 0,
            });
        }
      }

      return res.status(201).json(message);
    }

    if (!receiverId) {
      return res.status(400).json({
        success: false,

        message: "Receiver ID is required",
      });
    }

    const chat = await Chat.findOne({
      isGroup: false,

      participants: {
        $all: [senderId, receiverId],
      },

      status: "accepted",
    });

    if (!chat) {
      return res.status(404).json({
        success: false,

        message: "Accepted conversation not found",
      });
    }

    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo);

      if (!repliedMessage) {
        return res.status(404).json({
          success: false,

          message: "Original message not found",
        });
      }

      if (repliedMessage.chatId?.toString() !== chat._id.toString()) {
        return res.status(403).json({
          success: false,

          message: "Cannot reply to this message",
        });
      }
    }

    const receiverSocketId = getUserSocketId(receiverId);

    const senderSocketId = getUserSocketId(senderId);

    const initialStatus = receiverSocketId ? "delivered" : "sent";

    let message = await Message.create({
      sender: senderId,

      receiver: receiverId,

      chatId: chat._id,

      fileUrl: result.secure_url,

      fileName: fileName,

      fileType: fileType,

      fileSize: fileSize,

      replyTo: replyTo || null,

      status: initialStatus,
    });

    chat.lastMessage = message._id;

    const activeChatId = [senderId.toString(), receiverId.toString()]
      .sort()
      .join("_");

    const receiverActiveChat = getActiveChat(receiverId);

    if (receiverActiveChat !== activeChatId) {
      const currentUnread = chat.unreadCount.get(receiverId.toString()) || 0;

      chat.unreadCount.set(
        receiverId.toString(),

        currentUnread + 1,
      );
    }

    await chat.save();

    message = await Message.findById(message._id)
      .populate("sender", "_id username avatar")
      .populate({
        path: "replyTo",

        select:
          "text image audio fileUrl fileName fileType fileSize sender isDeleted",

        populate: {
          path: "sender",

          select: "_id username avatar",
        },
      });

    if (senderSocketId) {
      getIO().to(senderSocketId).emit("receiveMessage", message);
    }

    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("receiveMessage", message);

      getIO()
        .to(receiverSocketId)
        .emit("unreadUpdated", {
          chatId: chat._id,

          count: chat.unreadCount.get(receiverId.toString()) || 0,
        });
    }

    return res.status(201).json(message);
  } catch (error) {
    console.error("Send file error:", error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

export default {
  sendMessage,

  getMessages,

  markAsSeen,

  sendImage,

  deleteMessage,

  deleteForMe,

  editMessage,

  sendVoice,

  resetUnreadCount,

  reactToMessage,

  sendGroupMessage,

  getGroupMessages,

  sendFile,
};
