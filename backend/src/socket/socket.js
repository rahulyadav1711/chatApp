import UserModel from "../model/user.schema.js";

const users = new Map();
const activeChats = new Map();

let ioInstance = null;

export const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO has not been initialized");
  }

  return ioInstance;
};

export const getUserSocketId = (userId) => {
  if (!userId) {
    return null;
  }

  return users.get(userId.toString()) || null;
};

export const getActiveChat = (userId) => {
  if (!userId) {
    return null;
  }

  return activeChats.get(userId.toString()) || null;
};

const setupSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("registerUser", (userId) => {
      if (!userId) {
        return;
      }

      const userIdString = userId.toString();

      const existingSocketId = users.get(userIdString);

      if (existingSocketId === socket.id) {
        return;
      }

      if (existingSocketId && existingSocketId !== socket.id) {
        console.log(
          "♻️ Replacing old socket:",
          userIdString,
          existingSocketId,
          "→",
          socket.id,
        );
      }

      users.set(userIdString, socket.id);

      socket.userId = userIdString;

      console.log("🟢 User registered:", userIdString, "Socket:", socket.id);

      io.emit("onlineUsers", Array.from(users.keys()));
    });

    socket.on("joinChat", (chatId) => {
      if (!socket.userId || !chatId) {
        return;
      }

      activeChats.set(socket.userId.toString(), chatId.toString());

      socket.join(chatId.toString());

      console.log("💬 Joined chat:", socket.userId, chatId.toString());
    });

    socket.on("leaveChat", (chatId) => {
      if (!socket.userId) {
        return;
      }

      activeChats.delete(socket.userId.toString());

      if (chatId) {
        socket.leave(chatId.toString());
      }
    });

    socket.on("joinGroup", (groupId) => {
      if (!groupId) {
        return;
      }

      socket.join(groupId.toString());
    });

    socket.on("leaveGroup", (groupId) => {
      if (!groupId) {
        return;
      }

      socket.leave(groupId.toString());
    });

    socket.on("typing", ({ receiverId, senderName }) => {
      if (!receiverId) {
        return;
      }

      const receiverSocketId = users.get(receiverId.toString());

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", senderName);
      }
    });

    socket.on("stopTyping", (receiverId) => {
      if (!receiverId) {
        return;
      }

      const receiverSocketId = users.get(receiverId.toString());

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userStoppedTyping");
      }
    });

    socket.on("sendMessage", (data) => {
      if (!data?.receiverId) {
        return;
      }

      const receiverSocketId = users.get(data.receiverId.toString());

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", data);
      }
    });

    socket.on("messageDelivered", async ({ messageId, senderId }) => {
      if (!messageId || !senderId) {
        return;
      }

      console.log("📦 Message delivered:", messageId);

      const senderSocketId = users.get(senderId.toString());

      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeliveredUpdate", {
          messageId: messageId.toString(),
          status: "delivered",
        });
      }
    });

    socket.on("sendImage", (data) => {
      if (!data?.receiverId) {
        return;
      }

      const receiverSocketId = users.get(data.receiverId.toString());

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveImage", data);
      }
    });

    socket.on("sendGroupMessage", (data) => {
      if (!data?.groupId) {
        return;
      }

      io.to(data.groupId.toString()).emit("receiveGroupMessage", data);
    });

    socket.on("deleteMessage", (data) => {
      if (!data?.receiverId) {
        return;
      }

      const receiverSocketId = users.get(data.receiverId.toString());

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", data);
      }
    });

    socket.on("editMessage", (data) => {
      if (!data?.receiverId) {
        return;
      }

      const receiverSocketId = users.get(data.receiverId.toString());

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageEdited", data);
      }
    });

    socket.on("sendVoice", (data) => {
      if (!data?.receiverId) {
        return;
      }

      const receiverSocketId = users.get(data.receiverId.toString());

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveVoice", data);
      }
    });

    socket.on(
      "callUser",
      ({ receiverId, callerId, callerName, callerAvatar, callType, offer }) => {
        if (!receiverId || !callerId || !callType) {
          return;
        }

        const receiverSocketId = users.get(receiverId.toString());

        console.log(
          "📞 Incoming call:",
          callType,
          "from:",
          callerId,
          "to:",
          receiverId,
        );

        if (!receiverSocketId) {
          socket.emit("callUserOffline", {
            receiverId: receiverId.toString(),
          });

          return;
        }

        io.to(receiverSocketId).emit("incomingCall", {
          callerId: callerId.toString(),
          callerName: callerName || "Unknown user",
          callerAvatar: callerAvatar || "",
          callType,
          offer: offer || null,
        });
      },
    );

    socket.on("acceptCall", ({ callerId, receiverId, answer }) => {
      if (!callerId || !receiverId || !answer) {
        return;
      }

      const callerSocketId = users.get(callerId.toString());

      console.log("✅ Call accepted:", callerId, "by", receiverId);

      if (callerSocketId) {
        io.to(callerSocketId).emit("callAccepted", {
          receiverId: receiverId.toString(),
          answer,
        });
      }
    });

    socket.on("rejectCall", ({ callerId, receiverId }) => {
      if (!callerId || !receiverId) {
        return;
      }

      const callerSocketId = users.get(callerId.toString());

      console.log("❌ Call rejected:", callerId, "by", receiverId);

      if (callerSocketId) {
        io.to(callerSocketId).emit("callRejected", {
          receiverId: receiverId.toString(),
        });
      }
    });

    socket.on("iceCandidate", ({ receiverId, candidate }) => {
      if (!receiverId || !candidate) {
        return;
      }

      const receiverSocketId = users.get(receiverId.toString());

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("iceCandidate", {
          candidate,
        });
      }
    });

    socket.on("endCall", ({ receiverId }) => {
      if (!receiverId) {
        return;
      }

      const receiverSocketId = users.get(receiverId.toString());

      console.log("🔴 Call ended by:", socket.userId, "for:", receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("callEnded", {
          callerId: socket.userId?.toString(),
        });
      }
    });

    socket.on("callBusy", ({ callerId, receiverId }) => {
      if (!callerId || !receiverId) {
        return;
      }

      const callerSocketId = users.get(callerId.toString());

      if (callerSocketId) {
        io.to(callerSocketId).emit("callBusy", {
          receiverId: receiverId.toString(),
        });
      }
    });

    socket.on("disconnect", async () => {
      console.log("🔴 Socket disconnected:", socket.id);

      if (socket.userId) {
        const currentSocketId = users.get(socket.userId);

        if (currentSocketId === socket.id) {
          try {
            await UserModel.findByIdAndUpdate(socket.userId, {
              lastSeen: new Date(),
            });
          } catch (error) {
            console.error("Failed to update lastSeen:", error);
          }

          users.delete(socket.userId);
          activeChats.delete(socket.userId);

          console.log("🔴 User offline:", socket.userId);
        }
      }

      io.emit("onlineUsers", Array.from(users.keys()));
    });
  });
};

export default setupSocket;
