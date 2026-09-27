import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Reply, Pencil, Trash2 } from "lucide-react";

import { useMessageMenu } from "../../context/MessageMenuContext";
import ConfirmModal from "../Common/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";

import {
  deleteMessage,
  deleteForMe,
  reactToMessage,
} from "../../services/messageService";

const MessageMenuPortal = () => {
  const {
    menuOpen,
    position,
    selectedMessage,
    closeMenu,
    startEditing,
    startReply,
  } = useMessageMenu();

  const { user } = useAuth();
  const { setMessages } = useChat();

  const menuRef = useRef(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [messageIdToDelete, setMessageIdToDelete] = useState(null);

  const MENU_WIDTH = 208;
  const MENU_HEIGHT = 230;
  const PADDING = 10;

  const reactions = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

  let left = position.x;
  let top = position.y;

  if (left + MENU_WIDTH > window.innerWidth - PADDING) {
    left = window.innerWidth - MENU_WIDTH - PADDING;
  }

  if (top + MENU_HEIGHT > window.innerHeight - PADDING) {
    top = position.y - MENU_HEIGHT - 12;
  }

  if (top < PADDING) {
    top = PADDING;
  }

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);

      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen, closeMenu]);

  const senderId =
    typeof selectedMessage?.sender === "object"
      ? selectedMessage.sender?._id?.toString()
      : selectedMessage?.sender?.toString();

  const currentUserId = user?._id?.toString();

  const isOwnMessage = selectedMessage && senderId === currentUserId;

  const EDIT_TIME_LIMIT = 15 * 60 * 1000;

  const isWithinEditTime =
    selectedMessage?.createdAt &&
    Date.now() - new Date(selectedMessage.createdAt).getTime() <=
      EDIT_TIME_LIMIT;

  const handleReaction = async (emoji) => {
    if (!selectedMessage?._id) return;

    try {
      const response = await reactToMessage(selectedMessage._id, emoji);

      const updatedMessage = response.message;

      if (updatedMessage) {
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
      }

      closeMenu();
    } catch (error) {
      console.error("Reaction failed:", error.response?.data || error);
    }
  };

  const handleDeleteForMe = () => {
    if (!selectedMessage?._id) return;

    setMessageIdToDelete(selectedMessage._id);

    setDeleteType("me");

    closeMenu();

    setShowDeleteModal(true);
  };

  const handleDeleteForEveryone = () => {
    if (!selectedMessage?._id) return;

    setMessageIdToDelete(selectedMessage._id);

    setDeleteType("everyone");

    closeMenu();

    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (!messageIdToDelete) {
        return;
      }

      if (deleteType === "me") {
        await deleteForMe(messageIdToDelete);

        setMessages((prev) =>
          prev.filter(
            (msg) => msg._id?.toString() !== messageIdToDelete?.toString(),
          ),
        );
      }

      if (deleteType === "everyone") {
        await deleteMessage(messageIdToDelete);
      }

      setMessageIdToDelete(null);
      setDeleteType(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Delete failed:", error.response?.data || error);
    }
  };

  if (!menuOpen && !showDeleteModal) {
    return null;
  }

  return (
    <>
      {menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
            style={{
              top,
              left,
            }}
          >
            <div className="mb-1 border-b border-gray-100 px-2 pb-2">
              <div className="flex items-center justify-between">
                {reactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all duration-150 hover:scale-125 hover:bg-gray-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                startReply(selectedMessage);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-100"
            >
              <Reply size={17} />

              <span>Reply</span>
            </button>

            {isOwnMessage &&
              !selectedMessage?.isDeleted &&
              isWithinEditTime && (
                <button
                  onClick={() => startEditing(selectedMessage)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                >
                  <Pencil size={17} />

                  <span>Edit</span>
                </button>
              )}

            {!selectedMessage?.isDeleted && (
              <>
                <button
                  onClick={handleDeleteForMe}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                >
                  <Trash2 size={17} />

                  <span>Delete for me</span>
                </button>

                {isOwnMessage && (
                  <button
                    onClick={handleDeleteForEveryone}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={17} />

                    <span>Delete for everyone</span>
                  </button>
                )}
              </>
            )}
          </div>,
          document.body,
        )}

      <ConfirmModal
        open={showDeleteModal}
        title={deleteType === "me" ? "Delete for me?" : "Delete for everyone?"}
        message={
          deleteType === "me"
            ? "This message will be removed from your chat only."
            : "This message will be deleted for everyone in this chat."
        }
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => {
          setMessageIdToDelete(null);

          setDeleteType(null);

          setShowDeleteModal(false);
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default MessageMenuPortal;
