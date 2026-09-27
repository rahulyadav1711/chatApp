import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

import {
  getMessages,
  getGroupMessages,
  markAsSeen,
} from "../../services/messageService";

import { useSocket } from "../../context/SocketContext";
import MessageMenuPortal from "./MessageMenuPortal";

const ChatWindow = () => {
  const bottomRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const messageRefs = useRef({});

  const [typingUser, setTypingUser] = useState("");

  const { user } = useAuth();
  const { socket } = useSocket();

  const {
    selectedUser,
    selectedChat,
    messages,
    setMessages,
    messagesLoading,
    setMessagesLoading,
  } = useChat();

  useEffect(() => {
    if (!selectedChat || !user?._id) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        setMessagesLoading(true);

        let data = [];

        if (selectedChat.isGroup) {
          data = await getGroupMessages(selectedChat._id);
        } else {
          if (!selectedUser?._id) {
            setMessages([]);
            return;
          }

          data = await getMessages(user._id, selectedUser._id);
        }

        setMessages(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(
          "Failed to fetch messages:",
          error.response?.data || error,
        );

        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [
    selectedChat?._id,
    selectedChat?.isGroup,
    selectedUser?._id,
    user?._id,
    setMessages,
    setMessagesLoading,
  ]);

  useEffect(() => {
    if (!socket || !selectedChat || !user?._id) {
      return;
    }

    let roomId;

    if (selectedChat.isGroup) {
      roomId = selectedChat._id;
    } else {
      if (!selectedUser?._id) {
        return;
      }

      roomId = [user._id, selectedUser._id].sort().join("_");
    }

    socket.emit("joinChat", roomId);

    return () => {
      socket.emit("leaveChat", roomId);
    };
  }, [
    socket,
    selectedChat?._id,
    selectedChat?.isGroup,
    selectedUser?._id,
    user?._id,
  ]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;

    const currentCount = messages.length;

    if (currentCount > previousCount) {
      bottomRef.current?.scrollIntoView({
        behavior: previousCount === 0 ? "auto" : "smooth",
        block: "end",
      });
    }

    previousMessageCountRef.current = currentCount;
  }, [messages.length]);

  useEffect(() => {
    if (!selectedChat || selectedChat.isGroup || !selectedUser || !user?._id) {
      return;
    }

    const markMessagesAsSeen = async () => {
      for (const message of messages) {
        const receiverId =
          typeof message.receiver === "object"
            ? message.receiver?._id
            : message.receiver;

        if (
          receiverId?.toString() === user._id?.toString() &&
          message.status !== "seen"
        ) {
          try {
            await markAsSeen(message._id);

            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg._id?.toString() === message._id?.toString()
                  ? {
                      ...msg,
                      status: "seen",
                    }
                  : msg,
              ),
            );
          } catch (error) {
            console.error("Failed to mark message as seen:", error);
          }
        }
      }
    };

    markMessagesAsSeen();
  }, [
    messages,
    selectedChat?._id,
    selectedChat?.isGroup,
    selectedUser?._id,
    user?._id,
    setMessages,
  ]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleSeenUpdate = ({ messageId, status }) => {
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          message._id?.toString() === messageId?.toString()
            ? {
                ...message,
                status,
              }
            : message,
        ),
      );
    };

    socket.on("messageSeenUpdate", handleSeenUpdate);

    return () => {
      socket.off("messageSeenUpdate", handleSeenUpdate);
    };
  }, [socket, setMessages]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleUserTyping = (senderName) => {
      setTypingUser(senderName || "Someone");
    };

    const handleUserStoppedTyping = () => {
      setTypingUser("");
    };

    socket.on("userTyping", handleUserTyping);

    socket.on("userStoppedTyping", handleUserStoppedTyping);

    return () => {
      socket.off("userTyping", handleUserTyping);

      socket.off("userStoppedTyping", handleUserStoppedTyping);
    };
  }, [socket]);

  const scrollToMessage = (messageId) => {
    const element = messageRefs.current[messageId];

    if (!element) {
      console.log("Original message not found:", messageId);
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    element.classList.add("ring-2", "ring-indigo-400", "rounded-2xl");

    setTimeout(() => {
      element.classList.remove("ring-2", "ring-indigo-400", "rounded-2xl");
    }, 1500);
  };

  const getDateLabel = (dateString) => {
    const messageDate = new Date(dateString);

    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();

    if (isSameDay(messageDate, today)) {
      return "Today";
    }

    if (isSameDay(messageDate, yesterday)) {
      return "Yesterday";
    }

    return messageDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year:
        messageDate.getFullYear() !== today.getFullYear()
          ? "numeric"
          : undefined,
    });
  };

  if (messagesLoading) {
    return (
      <div className="flex-1 overflow-hidden bg-[var(--app-bg)] px-6 py-6">
        <div className="space-y-5 animate-pulse">
          <div className="flex justify-start">
            <div className="h-12 w-[220px] rounded-2xl bg-[var(--surface-bg)]" />
          </div>

          <div className="flex justify-start">
            <div className="h-16 w-[280px] rounded-2xl bg-[var(--surface-bg)]" />
          </div>

          <div className="flex justify-end">
            <div className="h-12 w-[190px] rounded-2xl bg-[var(--surface-bg)]" />
          </div>

          <div className="flex justify-end">
            <div className="h-20 w-[260px] rounded-2xl bg-[var(--surface-bg)]" />
          </div>

          <div className="flex justify-start">
            <div className="h-12 w-[170px] rounded-2xl bg-[var(--surface-bg)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 bg-[var(--app-bg)] text-[var(--text-primary)] rounded-lg">
        <div className="space-y-2">
          {messages.map((message, index) => {
            const senderId =
              typeof message.sender === "object"
                ? message.sender?._id
                : message.sender;

            const getSenderId = (msg) => {
              if (!msg) {
                return null;
              }

              return typeof msg.sender === "object"
                ? msg.sender?._id?.toString()
                : msg.sender?.toString();
            };

            const previousMessage = index > 0 ? messages[index - 1] : null;

            const nextMessage =
              index < messages.length - 1 ? messages[index + 1] : null;

            const previousSenderId = getSenderId(previousMessage);

            const nextSenderId = getSenderId(nextMessage);

            const currentSenderId = senderId?.toString();

            const own = senderId?.toString() === user?._id?.toString();

            const currentDate = getDateLabel(message.createdAt);

            const previousDate =
              index > 0 ? getDateLabel(messages[index - 1].createdAt) : null;

            const showDateSeparator =
              index === 0 || currentDate !== previousDate;

            const nextDate = nextMessage
              ? getDateLabel(nextMessage.createdAt)
              : null;

            const sameSenderAsPrevious =
              !showDateSeparator && previousSenderId === currentSenderId;

            const sameSenderAsNext =
              nextMessage &&
              nextDate === currentDate &&
              nextSenderId === currentSenderId;

            const isFirstInGroup = !sameSenderAsPrevious;

            const isLastInGroup = !sameSenderAsNext;

            return (
              <div key={message._id}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center py-3">
                    <span className="bg-[var(--surface-bg)] text-[var(--text-secondary)] border border-[var(--border-color)] text-[11px] font-medium px-3 py-1 rounded-full shadow-sm select-none">
                      {currentDate}
                    </span>
                  </div>
                )}

                <div
                  ref={(element) => {
                    if (element) {
                      messageRefs.current[message._id] = element;
                    } else {
                      delete messageRefs.current[message._id];
                    }
                  }}
                  className={`transition-all duration-300 ${
                    isLastInGroup ? "mb-3" : "mb-1"
                  }`}
                >
                  <MessageBubble
                    message={message}
                    own={own}
                    isGroup={selectedChat?.isGroup}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    onReplyClick={scrollToMessage}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {typingUser && (
          <div className="px-2 py-2 text-sm text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-2">
              <span>{typingUser} is typing</span>

              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] animate-bounce" />

                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] animate-bounce [animation-delay:150ms]" />

                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] animate-bounce [animation-delay:300ms]" />
              </span>
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageMenuPortal />
    </>
  );
};

export default ChatWindow;
