import { createContext, useContext, useEffect } from "react";

import socket from "../socket/socket";
import { useAuth } from "./AuthContext";
import { useChat } from "./ChatContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();

  const {
    setOnlineUsers,
    setMessages,
    setTypingUser,
    setChats,
    setSelectedChat,
    clearConversation,
  } = useChat();

  useEffect(() => {
    if (!user?._id) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    const handleConnect = () => {
      console.log("🔐 Registering user:", user._id);

      socket.emit("registerUser", user._id);
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleReceiveMessage = (message) => {
      if (!message?._id) {
        return;
      }

      console.log("📩 Message received:", message);

      const receiverId =
        typeof message.receiver === "object"
          ? message.receiver?._id
          : message.receiver;

      const senderId =
        typeof message.sender === "object"
          ? message.sender?._id
          : message.sender;

      if (receiverId?.toString() === user?._id?.toString()) {
        console.log("📦 Sending delivery acknowledgement:", message._id);

        socket.emit("messageDelivered", {
          messageId: message._id,
          senderId: senderId,
        });
      }

      setMessages((prev) => {
        const exists = prev.some(
          (msg) => msg._id?.toString() === message._id?.toString(),
        );

        if (exists) {
          return prev.map((msg) =>
            msg._id?.toString() === message._id?.toString()
              ? {
                  ...msg,
                  ...message,
                }
              : msg,
          );
        }

        return [...prev, message];
      });
    };

    const handleGroupMessage = (message) => {
      if (!message?._id) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some(
          (msg) => msg._id?.toString() === message._id?.toString(),
        );

        if (exists) {
          return prev;
        }

        return [...prev, message];
      });
    };

    const handleUnreadUpdated = ({ chatId, count }) => {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat._id?.toString() !== chatId?.toString()) {
            return chat;
          }

          return {
            ...chat,
            unreadCount: {
              ...chat.unreadCount,
              [user._id]: count,
            },
          };
        }),
      );
    };

    const handleConversationCleared = ({ chatId }) => {
      clearConversation(chatId);
    };

    const handleUserTyping = (name) => {
      setTypingUser(name);
    };

    const handleUserStoppedTyping = () => {
      setTypingUser("");
    };

    const handleMessageEdited = (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id?.toString() === updatedMessage._id?.toString()) {
            return {
              ...msg,
              ...updatedMessage,
            };
          }

          const replyId =
            typeof msg.replyTo === "object"
              ? msg.replyTo?._id?.toString()
              : msg.replyTo?.toString();

          if (replyId === updatedMessage._id?.toString()) {
            return {
              ...msg,
              replyTo: {
                ...(typeof msg.replyTo === "object" ? msg.replyTo : {}),
                ...updatedMessage,
              },
            };
          }

          return msg;
        }),
      );
    };

    const handleMessageDeleted = (data) => {
      const messageId = typeof data === "string" ? data : data?.messageId;

      if (!messageId) {
        return;
      }

      const deletedId = messageId.toString();

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id?.toString() === deletedId) {
            return {
              ...msg,
              isDeleted: true,
              text: "",
              image: null,
              audio: null,
              reactions: [],
            };
          }

          const replyId =
            typeof msg.replyTo === "object"
              ? msg.replyTo?._id?.toString()
              : msg.replyTo?.toString();

          if (replyId === deletedId) {
            return {
              ...msg,
              replyToDeleted: true,
            };
          }

          return msg;
        }),
      );
    };

    const handleMessageReactionUpdated = (updatedMessage) => {
      if (!updatedMessage?._id) {
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id?.toString() === updatedMessage._id?.toString()
            ? {
                ...msg,
                ...updatedMessage,
                reactions: updatedMessage.reactions || [],
              }
            : msg,
        ),
      );
    };

    const handleMessageDeliveredUpdate = ({ messageId, status }) => {
      console.log("📦 Delivery status update:", messageId, status);

      if (!messageId) {
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id?.toString() === messageId?.toString()
            ? {
                ...msg,
                status: status || "delivered",
              }
            : msg,
        ),
      );
    };

    const handleMessageSeenUpdate = ({ messageId, status }) => {
      console.log("👀 Message status update:", messageId, status);

      if (!messageId) {
        return;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id?.toString() === messageId?.toString()
            ? {
                ...msg,
                status: status || "seen",
              }
            : msg,
        ),
      );
    };

    const handleGroupCreated = (group) => {
      if (!group?._id) {
        return;
      }

      setChats((prev) => {
        const exists = prev.some(
          (chat) => chat._id?.toString() === group._id?.toString(),
        );

        if (exists) {
          return prev;
        }

        return [group, ...prev];
      });
    };

    const handleGroupUpdated = (updatedGroup) => {
      if (!updatedGroup?._id) {
        return;
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat._id?.toString() === updatedGroup._id?.toString()
            ? {
                ...chat,
                ...updatedGroup,
              }
            : chat,
        ),
      );

      setSelectedChat((prev) => {
        if (prev?._id?.toString() !== updatedGroup._id?.toString()) {
          return prev;
        }

        return {
          ...prev,
          ...updatedGroup,
        };
      });
    };

    const handleRemovedFromGroup = ({ groupId }) => {
      if (!groupId) {
        return;
      }

      setChats((prev) =>
        prev.filter((chat) => chat._id?.toString() !== groupId.toString()),
      );

      if (selectedChat?._id?.toString() === groupId.toString()) {
        setSelectedChat(null);
        setMessages([]);
      }
    };

    const handleGroupRemoved = ({ groupId }) => {
      if (!groupId) {
        return;
      }

      setChats((prev) =>
        prev.filter((chat) => chat._id?.toString() !== groupId.toString()),
      );

      setSelectedChat((prev) => {
        if (prev?._id?.toString() === groupId.toString()) {
          return null;
        }

        return prev;
      });

      setMessages((prev) => {
        return prev;
      });
    };

    socket.on("connect", handleConnect);

    socket.on("onlineUsers", handleOnlineUsers);

    socket.on("receiveMessage", handleReceiveMessage);

    socket.on("receiveGroupMessage", handleGroupMessage);

    socket.on("unreadUpdated", handleUnreadUpdated);

    socket.on("conversationCleared", handleConversationCleared);

    socket.on("userTyping", handleUserTyping);

    socket.on("userStoppedTyping", handleUserStoppedTyping);

    socket.on("messageEdited", handleMessageEdited);

    socket.on("messageDeleted", handleMessageDeleted);

    socket.on("messageReactionUpdated", handleMessageReactionUpdated);

    socket.on("messageDeliveredUpdate", handleMessageDeliveredUpdate);

    socket.on("messageSeenUpdate", handleMessageSeenUpdate);

    socket.on("groupCreated", handleGroupCreated);

    socket.on("groupUpdated", handleGroupUpdated);

    socket.on("removedFromGroup", handleRemovedFromGroup);

    socket.on("groupLeft", handleGroupRemoved);

    socket.on("groupDeleted", handleGroupRemoved);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);

      socket.off("onlineUsers", handleOnlineUsers);

      socket.off("receiveMessage", handleReceiveMessage);

      socket.off("receiveGroupMessage", handleGroupMessage);

      socket.off("unreadUpdated", handleUnreadUpdated);

      socket.off("conversationCleared", handleConversationCleared);

      socket.off("userTyping", handleUserTyping);

      socket.off("userStoppedTyping", handleUserStoppedTyping);

      socket.off("messageEdited", handleMessageEdited);

      socket.off("messageDeleted", handleMessageDeleted);

      socket.off("messageReactionUpdated", handleMessageReactionUpdated);

      socket.off("messageDeliveredUpdate", handleMessageDeliveredUpdate);

      socket.off("messageSeenUpdate", handleMessageSeenUpdate);

      socket.off("groupCreated", handleGroupCreated);

      socket.off("groupUpdated", handleGroupUpdated);

      socket.off("removedFromGroup", handleRemovedFromGroup);

      socket.off("groupLeft", handleGroupRemoved);

      socket.off("groupDeleted", handleGroupRemoved);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
