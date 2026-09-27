import { useEffect, useState } from "react";
import { Check, CheckCheck, X, Download, FileText, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import MessageActionButton from "./MessageActionButton";
import { useMessageMenu } from "../../context/MessageMenuContext";
import { editMessage, reactToMessage } from "../../services/messageService";
import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import VoiceMessage from "./VoiceMessage";

const MessageBubble = ({
  message,
  own,
  onReplyClick,
  isGroup = false,
  isFirstInGroup = true,
  isLastInGroup = true,
}) => {
  const { editingMessage, cancelEditing } = useMessageMenu();

  const isEditing = editingMessage?._id === message._id;

  const [editText, setEditText] = useState(message.text || "");
  const [imageOpen, setImageOpen] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setEditText(message.text || "");
    }
  }, [isEditing, message.text]);

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const { setMessages } = useChat();
  const { user } = useAuth();

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;

    try {
      const response = await editMessage(message._id, editText);

      const updatedMessage = response.message;

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      );

      cancelEditing();
    } catch (error) {
      console.error("Failed to edit message:", error.response?.data || error);
    }
  };

  const handleReactionClick = async (emoji) => {
    try {
      await reactToMessage(message._id, emoji);
    } catch (error) {
      console.error("Reaction failed:", error.response?.data || error);
    }
  };

  const fileType = message.fileType?.toLowerCase() || "";

  const isVideoFile = fileType.startsWith("video/");

  const isAudioFile = fileType.startsWith("audio/");

  const isLocationMessage =
    typeof message.text === "string" &&
    message.text.startsWith("📍 My Location");

  const locationUrl = isLocationMessage
    ? message.text.match(/https?:\/\/\S+/)?.[0]
    : null;

  const formatFileSize = (size) => {
    if (!size) return "File";

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <>
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.25,
        }}
        className={`flex ${own ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`group relative max-w-[72%] min-w-[90px] px-3.5 py-2.5 border transition-all duration-200 shadow-sm
            ${
              own
                ? `
                    bg-[var(--message-own)]
                    text-white
                    border-transparent
                  `
                : `
                    bg-[var(--message-other)]
                    text-[var(--text-primary)]
                    border-[var(--border-color)]
                  `
            }

            ${
              isFirstInGroup && isLastInGroup
                ? "rounded-2xl"
                : own
                  ? `
                    rounded-l-2xl
                    ${isFirstInGroup ? "rounded-tr-2xl" : "rounded-tr-md"}
                    rounded-br-md
                  `
                  : `
                    rounded-r-2xl
                    ${isFirstInGroup ? "rounded-tl-2xl" : "rounded-tl-md"}
                    rounded-bl-md
                  `
            }
          `}
        >
          {!message.isDeleted && !isEditing && (
            <MessageActionButton own={own} message={message} />
          )}

          {isGroup && !own && isFirstInGroup && (
            <div className="flex items-center gap-2 mb-1.5">
              {message.sender?.avatar ? (
                <img
                  src={message.sender.avatar}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white">
                  {message.sender?.username?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}

              <span className="text-xs font-semibold text-indigo-300">
                {message.sender?.username || "Unknown user"}
              </span>
            </div>
          )}

          {(message.replyTo || message.replyToDeleted) && (
            <div
              onClick={() => {
                if (message.replyToDeleted) return;

                const replyId =
                  typeof message.replyTo === "object"
                    ? message.replyTo?._id
                    : message.replyTo;

                if (replyId) {
                  onReplyClick?.(replyId);
                }
              }}
              className={`mb-2.5 overflow-hidden rounded-xl border transition ${
                message.replyToDeleted
                  ? "cursor-default opacity-70"
                  : "cursor-pointer"
              } ${
                own
                  ? "border-indigo-400/20 bg-indigo-700/50 hover:bg-indigo-700/70"
                  : "border-[var(--border-color)] bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <div className="flex">
                <div
                  className={`w-1 shrink-0 ${
                    message.replyToDeleted
                      ? "bg-zinc-500"
                      : own
                        ? "bg-indigo-300"
                        : "bg-indigo-500"
                  }`}
                />

                <div className="min-w-0 px-3 py-2">
                  <p
                    className={`text-[11px] font-semibold ${
                      message.replyToDeleted
                        ? "text-zinc-400"
                        : own
                          ? "text-indigo-200"
                          : "text-indigo-400"
                    }`}
                  >
                    Reply
                  </p>

                  <p
                    className={`mt-0.5 max-w-[280px] truncate text-sm ${
                      own ? "text-white/70" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {message.replyToDeleted
                      ? "Original message was deleted"
                      : message.replyTo?.text ||
                        (message.replyTo?.image
                          ? "📷 Photo"
                          : message.replyTo?.audio
                            ? "🎤 Voice message"
                            : "Message")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {message.reactions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(
                message.reactions.reduce((acc, reaction) => {
                  if (!acc[reaction.emoji]) {
                    acc[reaction.emoji] = {
                      count: 0,
                      reactedByMe: false,
                    };
                  }

                  acc[reaction.emoji].count++;

                  const reactionUserId =
                    typeof reaction.user === "object"
                      ? reaction.user?._id?.toString()
                      : reaction.user?.toString();

                  if (reactionUserId === user?._id?.toString()) {
                    acc[reaction.emoji].reactedByMe = true;
                  }

                  return acc;
                }, {}),
              ).map(([emoji, { count, reactedByMe }]) => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all duration-150 hover:scale-105 shadow-sm ${
                    reactedByMe
                      ? "border-indigo-400 bg-indigo-500/20"
                      : "border-[var(--border-color)] bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <span className="text-sm">{emoji}</span>

                  {count > 1 && (
                    <span
                      className={
                        reactedByMe
                          ? "text-indigo-100"
                          : "text-[var(--text-secondary)]"
                      }
                    >
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {isEditing ? (
            <div className="min-w-[250px]">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveEdit();
                  }

                  if (e.key === "Escape") {
                    cancelEditing();
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-color)] outline-none focus:border-indigo-500"
              />

              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={cancelEditing}
                  className="px-3 py-1 text-sm rounded-lg bg-white/20 hover:bg-white/30"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSaveEdit}
                  disabled={!editText.trim()}
                  className="px-3 py-1 text-sm rounded-lg bg-white text-indigo-600 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          ) : message.isDeleted ? (
            <p className="text-[13px] italic text-[var(--text-secondary)] flex items-center gap-1.5">
              This message was deleted
            </p>
          ) : isLocationMessage && locationUrl ? (
            <div className="mt-1 w-[250px] max-w-full rounded-xl overflow-hidden bg-black/10 border border-white/10">
              <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-green-500/15 flex items-center justify-center text-green-400">
                  <MapPin size={21} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold">My Location</p>

                  <p className="text-xs opacity-60">Location shared with you</p>
                </div>
              </div>

              <a
                href={locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 mx-3 mb-3 px-4 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition"
              >
                <MapPin size={16} />
                Open in Google Maps
              </a>
            </div>
          ) : (
            message.text && (
              <p className="text-[15px] leading-[1.45] whitespace-pre-wrap break-words">
                {message.text}
              </p>
            )
          )}

          {!message.isDeleted && message.image && (
            <button
              type="button"
              onClick={() => setImageOpen(true)}
              className="mt-2 block overflow-hidden rounded-xl cursor-pointer"
            >
              <img
                src={message.image}
                alt="sent"
                className="w-[220px] max-h-[260px] sm:w-[260px] object-cover rounded-xl transition duration-200 hover:brightness-95"
              />
            </button>
          )}

          {!message.isDeleted && message.fileUrl && isVideoFile && (
            <div className="mt-2 overflow-hidden rounded-xl bg-black/20">
              <video
                src={message.fileUrl}
                controls
                playsInline
                preload="metadata"
                className="w-[260px] max-w-full max-h-[320px] rounded-xl"
              />

              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    {message.fileName || "Video"}
                  </p>

                  <p className="text-[10px] opacity-60">
                    {formatFileSize(message.fileSize)}
                  </p>
                </div>

                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={message.fileName || "video"}
                  className="w-8 h-8 shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                  title="Download video"
                >
                  <Download size={15} />
                </a>
              </div>
            </div>
          )}

          {!message.isDeleted && message.fileUrl && isAudioFile && (
            <div className="mt-2 p-2.5 rounded-xl bg-black/20 w-[280px] max-w-full">
              <audio
                src={message.fileUrl}
                controls
                preload="metadata"
                className="w-full"
              />

              <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-xs truncate opacity-80">
                  {message.fileName || "Audio"}
                </p>

                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={message.fileName || "audio"}
                  className="w-7 h-7 shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  title="Download audio"
                >
                  <Download size={14} />
                </a>
              </div>
            </div>
          )}

          {!message.isDeleted &&
            message.fileUrl &&
            !isVideoFile &&
            !isAudioFile && (
              <div className="mt-2 flex items-center gap-3 w-[260px] max-w-full p-3 rounded-xl bg-black/20">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-white/10 flex items-center justify-center">
                  <FileText size={20} className="opacity-80" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {message.fileName || "Document"}
                  </p>

                  <p className="text-[11px] opacity-60">
                    {formatFileSize(message.fileSize)}
                  </p>
                </div>

                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={message.fileName || "file"}
                  className="w-9 h-9 shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                  title="Download file"
                >
                  <Download size={16} />
                </a>
              </div>
            )}

          {!message.isDeleted && message.audio && (
            <VoiceMessage src={message.audio} isOwn={own} />
          )}

          <div
            className={`flex justify-end items-center gap-1 mt-1.5 select-none ${
              own ? "text-white/70" : "text-[var(--text-secondary)]"
            }`}
          >
            {message.isEdited && message.status === "seen" && (
              <span className="text-[10px] leading-none">edited</span>
            )}

            <span className="text-[11px] opacity-70">{time}</span>

            {own && (
              <>
                {message.status === "sent" && (
                  <Check size={14} className="opacity-80" />
                )}

                {message.status === "delivered" && (
                  <CheckCheck size={14} className="opacity-80" />
                )}

                {message.status === "seen" && (
                  <CheckCheck size={14} className="text-sky-400" />
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {imageOpen && message.image && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6"
          onClick={() => setImageOpen(false)}
        >
          <button
            type="button"
            onClick={() => setImageOpen(false)}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition"
          >
            <X size={24} />
          </button>

          <img
            src={message.image}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
};

export default MessageBubble;
