import {
  MoreVertical,
  Phone,
  Video,
  Users,
  UserRound,
  Trash2,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { useChat } from "../../context/ChatContext";
import { useCall } from "../../context/CallContext";

import GroupInfoModal from "./GroupInfoModal";
import UserInfoModal from "../Common/UserInfoModal";
import ImagePreviewModal from "../Common/ImagePreviewModal";

import { clearConversation as clearConversationApi } from "../../services/chatService";

import toast from "react-hot-toast";

const ChatHeader = () => {
  const { selectedUser, selectedChat, onlineUsers, clearConversation } =
    useChat();

  const { startCall, callStatus } = useCall();

  const [menuOpen, setMenuOpen] = useState(false);
  const [userInfoOpen, setUserInfoOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setUserInfoOpen(false);
    setGroupInfoOpen(false);
    setImagePreviewOpen(false);
  }, [selectedChat?._id]);

  if (!selectedChat) {
    return null;
  }

  const isGroup = selectedChat.isGroup;

  const isOnline =
    !isGroup && selectedUser?._id && onlineUsers.includes(selectedUser._id);

  const memberCount = selectedChat.participants?.length || 0;

  const handleHeaderClick = () => {
    if (isGroup) {
      setGroupInfoOpen(true);
      return;
    }

    setUserInfoOpen(true);
  };

  const handleStartCall = async (type) => {
    if (isGroup) {
      toast.error("Calls are available for private chats only.");
      return;
    }

    if (!selectedUser?._id) {
      toast.error("Please select a user.");
      return;
    }

    if (!isOnline) {
      toast.error("This user is offline.");
      return;
    }

    if (callStatus !== "idle") {
      toast.error("You are already in a call.");
      return;
    }

    try {
      await startCall(selectedUser, type);
    } catch (error) {
      console.error("Failed to start call:", error);
      toast.error("Unable to start the call.");
    }
  };

  const handleClearConversation = async () => {
    if (!selectedChat?._id) {
      return;
    }

    try {
      setMenuOpen(false);

      await clearConversationApi(selectedChat._id);

      clearConversation(selectedChat._id);

      toast.success("Conversation cleared");
    } catch (error) {
      console.error(
        "Failed to clear conversation:",
        error.response?.data || error,
      );

      toast.error("Failed to clear conversation");
    }
  };

  return (
    <>
      <div
        className="
          h-20
          shrink-0
          border-b
          border-[var(--border-color)]
          bg-[var(--header-bg)]
          text-[var(--text-primary)]
          px-6
          flex
          items-center
          justify-between
          transition-colors
          duration-200
        "
      >
        <button
          type="button"
          onClick={handleHeaderClick}
          className="
            flex
            min-w-0
            items-center
            gap-3
            rounded-xl
            p-1.5
            text-left
            transition
            hover:bg-[var(--surface-hover)]
          "
        >
          {isGroup ? (
            selectedChat.groupPhoto ? (
              <img
                src={selectedChat.groupPhoto}
                alt={selectedChat.groupName || "Group"}
                onClick={(e) => {
                  e.stopPropagation();
                  setImagePreviewOpen(true);
                }}
                className="
                  h-12
                  w-12
                  shrink-0
                  rounded-full
                  object-cover
                  cursor-zoom-in
                  transition
                  duration-200
                  hover:opacity-80
                  hover:scale-105
                "
              />
            ) : (
              <div
                className="
                  h-12
                  w-12
                  shrink-0
                  rounded-full
                  bg-indigo-600
                  flex
                  items-center
                  justify-center
                  text-white
                  font-semibold
                  text-lg
                "
              >
                {selectedChat.groupName?.charAt(0)?.toUpperCase() || "G"}
              </div>
            )
          ) : selectedUser?.avatar ? (
            <img
              src={selectedUser.avatar}
              alt={selectedUser.username || "User"}
              onClick={(e) => {
                e.stopPropagation();
                setImagePreviewOpen(true);
              }}
              className="
                h-12
                w-12
                shrink-0
                rounded-full
                object-cover
                cursor-zoom-in
                transition
                duration-200
                hover:opacity-80
                hover:scale-105
              "
            />
          ) : (
            <div
              className="
                h-12
                w-12
                shrink-0
                rounded-full
                bg-indigo-600
                flex
                items-center
                justify-center
                text-white
                font-semibold
              "
            >
              {selectedUser?.username?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}

          <div className="min-w-0">
            <h2
              className="
                truncate
                text-lg
                font-semibold
                text-[var(--text-primary)]
              "
            >
              {isGroup ? selectedChat.groupName : selectedUser?.username}
            </h2>

            {isGroup ? (
              <p className="text-sm text-zinc-400">
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </p>
            ) : (
              <p
                className={`text-sm ${
                  isOnline ? "text-green-500" : "text-[var(--text-secondary)]"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2">
          {isGroup ? (
            <button
              type="button"
              onClick={handleHeaderClick}
              className="
                rounded-full
                p-2.5
                text-zinc-400
                transition
                hover:bg-zinc-800
                hover:text-white
              "
              title="Group info"
            >
              <Users size={20} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleStartCall("voice")}
                disabled={!isOnline || callStatus !== "idle"}
                className="
                  rounded-full
                  p-2.5
                  text-[var(--text-secondary)]
                  transition
                  hover:bg-[var(--surface-hover)]
                  hover:text-[var(--text-primary)]
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                "
                title={!isOnline ? "User is offline" : "Voice call"}
              >
                <Phone size={20} />
              </button>

              <button
                type="button"
                onClick={() => handleStartCall("video")}
                disabled={!isOnline || callStatus !== "idle"}
                className="
                  rounded-full
                  p-2.5
                  text-[var(--text-secondary)]
                  transition
                  hover:bg-[var(--surface-hover)]
                  hover:text-[var(--text-primary)]
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                "
                title={!isOnline ? "User is offline" : "Video call"}
              >
                <Video size={20} />
              </button>
            </>
          )}

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`rounded-full p-2.5 transition ${
                menuOpen
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              }`}
              title="More options"
            >
              <MoreVertical size={20} />
            </button>

            {menuOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-12
                  z-50
                  w-56
                  overflow-hidden
                  rounded-xl
                  border
                  border-[var(--border-color)]
                  bg-[var(--surface-bg)]
                  shadow-2xl
                "
              >
                {!isGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setUserInfoOpen(true);
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      px-4
                      py-3
                      text-sm
                      text-[var(--text-primary)]
                      hover:bg-[var(--surface-hover)]
                    "
                  >
                    <UserRound size={18} />
                    View contact
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClearConversation}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    border-t
                    border-[var(--border-color)]
                    px-4
                    py-3
                    text-sm
                    text-red-400
                    transition
                    hover:bg-zinc-700
                  "
                >
                  <Trash2 size={18} />
                  Clear conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isGroup && (
        <UserInfoModal
          isOpen={userInfoOpen}
          onClose={() => setUserInfoOpen(false)}
          user={selectedUser}
          isOnline={isOnline}
        />
      )}

      {isGroup && (
        <GroupInfoModal
          open={groupInfoOpen}
          onClose={() => setGroupInfoOpen(false)}
        />
      )}

      <ImagePreviewModal
        isOpen={imagePreviewOpen}
        onClose={() => setImagePreviewOpen(false)}
        src={isGroup ? selectedChat?.groupPhoto : selectedUser?.avatar}
        alt={
          isGroup
            ? selectedChat?.groupName || "Group"
            : selectedUser?.username || "User"
        }
      />
    </>
  );
};

export default ChatHeader;
