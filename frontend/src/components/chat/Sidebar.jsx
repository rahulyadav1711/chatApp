import {
  Search,
  LogOut,
  Settings,
  Bell,
  SquarePen,
  Plus,
  Users,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useChat } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";

import { getChats, getPendingRequests } from "../../services/chatService";

import { useSocket } from "../../context/SocketContext";
import { logout } from "../../services/authService";

import ProfileModal from "../Profile/ProfileModal";
import SettingsModal from "../Settings/SettingsModal";

import { resetUnread } from "../../services/messageService";
import { useTheme } from "../../context/ThemeContext";

const Sidebar = () => {
  const { user, setUser } = useAuth();

  const {
    selectedUser,
    setSelectedUser,
    selectedChat,
    setSelectedChat,
    onlineUsers,
    chats,
    setChats,
  } = useChat();

  const navigate = useNavigate();

  const { socket } = useSocket();

  const { theme, changeTheme } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();

      socket?.disconnect();

      setUser(null);

      localStorage.removeItem("selectedChat");

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    fetchSidebar();
  }, []);

  const fetchSidebar = async () => {
    try {
      const [chatData, requestData] = await Promise.all([
        getChats(),
        getPendingRequests(),
      ]);

      setChats(Array.isArray(chatData) ? chatData : []);

      setPendingCount(Array.isArray(requestData) ? requestData.length : 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const refreshSidebar = () => {
      fetchSidebar();
    };

    socket.on("friendRequestReceived", refreshSidebar);

    socket.on("friendRequestAccepted", refreshSidebar);

    socket.on("friendRequestRejected", refreshSidebar);

    return () => {
      socket.off("friendRequestReceived", refreshSidebar);

      socket.off("friendRequestAccepted", refreshSidebar);

      socket.off("friendRequestRejected", refreshSidebar);
    };
  }, [socket]);

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      if (chat.isGroup) {
        return chat.groupName?.toLowerCase().includes(search.toLowerCase());
      }

      const otherUser = chat.participants.find(
        (participant) => participant._id !== user?._id,
      );

      return otherUser?.username?.toLowerCase().includes(search.toLowerCase());
    });
  }, [chats, search, user]);

  const sortedChats = useMemo(() => {
    return [...filteredChats].sort((a, b) => {
      const unreadA = a.unreadCount?.[user?._id] || 0;

      const unreadB = b.unreadCount?.[user?._id] || 0;

      if (unreadA > 0 && unreadB === 0) {
        return -1;
      }

      if (unreadA === 0 && unreadB > 0) {
        return 1;
      }

      const timeA = new Date(
        a.lastMessage?.createdAt || a.updatedAt || 0,
      ).getTime();

      const timeB = new Date(
        b.lastMessage?.createdAt || b.updatedAt || 0,
      ).getTime();

      return timeB - timeA;
    });
  }, [filteredChats, user?._id]);

  return (
    <aside
      className="
                w-80
                flex
                flex-col
                bg-[var(--sidebar-bg)]
                border-r
                border-[var(--border-color)]
                text-[var(--text-primary)]
                transition-colors
                duration-200
            "
    >
      <div
        className="
                    h-20
                    px-5
                    flex
                    items-center
                    justify-between
                    border-b
                    border-[var(--border-color)]
                "
      >
        <div
          onClick={() => setProfileOpen(true)}
          className="
                        flex
                        items-center
                        gap-3
                        cursor-pointer
                    "
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="avatar"
              className="
                                h-12
                                w-12
                                rounded-full
                                object-cover
                            "
            />
          ) : (
            <div
              className="
                                h-12
                                w-12
                                rounded-full
                                bg-indigo-600
                                flex
                                items-center
                                justify-center
                                text-white
                                font-bold
                                text-lg
                            "
            >
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h2
              className="
                                text-[var(--text-primary)]
                                font-semibold
                            "
            >
              {user?.username || "User"}
            </h2>

            <p
              className="
                                text-sm
                                text-green-400
                            "
            >
              Online
            </p>
          </div>
        </div>

        <Settings
          size={20}
          onClick={() => setSettingsOpen(true)}
          className="
                        text-[var(--text-secondary)]
                        cursor-pointer
                        hover:text-[var(--text-primary)]
                        transition
                    "
        />
      </div>

      <div
        className="
                    relative
                    p-4
                    border-b
                    border-[var(--border-color)]
                "
      >
        <div
          className="
                        flex
                        items-center
                        gap-2
                    "
        >
          <div
            className="
                            flex
                            flex-1
                            items-center
                            bg-[var(--input-bg)]
                            rounded-xl
                            px-3
                            py-2
                            transition-colors
                        "
          >
            <Search
              size={18}
              className="
                                text-[var(--text-secondary)]
                            "
            />

            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                                ml-3
                                w-full
                                bg-transparent
                                outline-none
                                text-[var(--text-primary)]
                                placeholder:text-[var(--text-secondary)]
                            "
            />
          </div>

          <button
            type="button"
            onClick={() => setActionMenuOpen((prev) => !prev)}
            className={`
                            relative
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            transition
                            ${
                              actionMenuOpen
                                ? "bg-indigo-600 text-white"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                            }
                        `}
          >
            {actionMenuOpen ? <X size={20} /> : <Plus size={21} />}

            {pendingCount > 0 && (
              <span
                className="
                                    absolute
                                    -right-1
                                    -top-1
                                    flex
                                    h-5
                                    min-w-[20px]
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-red-500
                                    px-1
                                    text-[10px]
                                    font-bold
                                    text-white
                                "
              >
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {actionMenuOpen && (
          <div
            className="
                            absolute
                            left-4
                            right-4
                            top-[66px]
                            z-50
                            overflow-hidden
                            rounded-xl
                            border
                            border-zinc-700
                            bg-zinc-800
                            shadow-2xl
                        "
          >
            <button
              type="button"
              onClick={() => {
                setActionMenuOpen(false);

                navigate("/new-chat");
              }}
              className="
                                flex
                                w-full
                                items-center
                                gap-3
                                px-4
                                py-3
                                text-left
                                text-sm
                                text-zinc-200
                                transition
                                hover:bg-zinc-700
                            "
            >
              <SquarePen size={18} className="text-zinc-400" />

              <span>New Chat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionMenuOpen(false);

                navigate("/create-group");
              }}
              className="
                                flex
                                w-full
                                items-center
                                gap-3
                                border-t
                                border-zinc-700
                                px-4
                                py-3
                                text-left
                                text-sm
                                text-zinc-200
                                transition
                                hover:bg-zinc-700
                            "
            >
              <Users size={18} className="text-zinc-400" />

              <span>Create Group</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionMenuOpen(false);

                navigate("/requests");
              }}
              className="
                                flex
                                w-full
                                items-center
                                justify-between
                                border-t
                                border-zinc-700
                                px-4
                                py-3
                                text-left
                                text-sm
                                text-zinc-200
                                transition
                                hover:bg-zinc-700
                            "
            >
              <div
                className="
                                    flex
                                    items-center
                                    gap-3
                                "
              >
                <Bell
                  size={18}
                  className="
                                        text-zinc-400
                                    "
                />

                <span>Friend Requests</span>
              </div>

              {pendingCount > 0 && (
                <span
                  className="
                                        flex
                                        h-5
                                        min-w-[20px]
                                        items-center
                                        justify-center
                                        rounded-full
                                        bg-red-500
                                        px-1
                                        text-[10px]
                                        font-bold
                                        text-white
                                    "
                >
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      <div
        className="
                    flex-1
                    overflow-y-auto
                "
      >
        {loading ? (
          <p
            className="
                            text-center
                            text-zinc-400
                            mt-5
                        "
          >
            Loading chats...
          </p>
        ) : filteredChats.length === 0 ? (
          <p
            className="
                            text-center
                            text-zinc-500
                            mt-5
                        "
          >
            No chats found
          </p>
        ) : (
          sortedChats.map((chat) => {
            const chatUser = chat.isGroup
              ? null
              : chat.participants.find(
                  (participant) => participant._id !== user?._id,
                );

            const displayName = chat.isGroup
              ? chat.groupName
              : chatUser?.username;

            const avatar = chat.isGroup ? chat.groupPhoto : chatUser?.avatar;

            const subtitle = chat.isGroup
              ? `${chat.participants.length} members`
              : chatUser?.email;

            const isOnline =
              !chat.isGroup && onlineUsers.includes(chatUser?._id);

            return (
              <div
                key={chat._id}
                onClick={async () => {
                  setSelectedChat(chat);

                  if (chat.isGroup) {
                    setSelectedUser(null);
                  } else {
                    setSelectedUser(chatUser);
                  }

                  navigate("/chat");

                  try {
                    await resetUnread(chat._id);

                    setChats((prev) =>
                      prev.map((c) =>
                        c._id === chat._id
                          ? {
                              ...c,

                              unreadCount: {
                                ...c.unreadCount,

                                [user._id]: 0,
                              },
                            }
                          : c,
                      ),
                    );
                  } catch (error) {
                    console.error("Failed to reset unread count:", error);
                  }
                }}
                className={`
                                    group
                                    relative
                                    flex
                                    items-center
                                    gap-3
                                    mx-2
                                    my-1
                                    px-3
                                    py-3
                                    rounded-xl
                                    cursor-pointer
                                    transition-all
                                    duration-200

                                    ${
                                      selectedChat?._id === chat._id
                                        ? "bg-[var(--surface-hover)]"
                                        : "hover:bg-[var(--surface-hover)]"
                                    }
                                `}
              >
                {selectedChat?._id === chat._id && (
                  <span
                    className="
                                            absolute
                                            left-0
                                            top-1/2
                                            -translate-y-1/2
                                            w-1
                                            h-8
                                            rounded-r-full
                                            bg-[var(--accent)]
                                        "
                  />
                )}

                <div
                  className="
                                        relative
                                    "
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={displayName}
                      className="
                                                h-12
                                                w-12
                                                rounded-full
                                                object-cover
                                            "
                    />
                  ) : (
                    <div
                      className="
                                                h-12
                                                w-12
                                                rounded-full
                                                bg-indigo-500
                                                flex
                                                items-center
                                                justify-center
                                                text-white
                                                font-semibold
                                            "
                    >
                      {displayName?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {isOnline && (
                    <span
                      className="
                                                absolute
                                                bottom-0
                                                right-0
                                                h-3
                                                w-3
                                                rounded-full
                                                bg-green-500
                                                border-2
                                                border-[var(--sidebar-bg)]
                                            "
                    />
                  )}
                </div>

                <div
                  className="
                                        flex-1
                                        overflow-hidden
                                    "
                >
                  <div
                    className="
                                            flex
                                            justify-between
                                            items-center
                                        "
                  >
                    <h3
                      className="
                                                truncate
                                                text-[14px]
                                                font-semibold
                                                text-[var(--text-primary)]
                                            "
                    >
                      {displayName}
                    </h3>

                    {(chat.unreadCount?.[user._id] || 0) > 0 && (
                      <span
                        className="
                                                    min-w-[20px]
                                                    h-5
                                                    px-1.5
                                                    rounded-full
                                                    bg-[var(--accent)]
                                                    text-white
                                                    text-[10px]
                                                    font-semibold
                                                    flex
                                                    items-center
                                                    justify-center
                                                    shadow-sm
                                                "
                      >
                        {chat.unreadCount?.[user._id]}
                      </span>
                    )}
                  </div>

                  <p
                    className="
                                            mt-0.5
                                            truncate
                                            text-[13px]
                                            text-[var(--text-secondary)]
                                        "
                  >
                    {chat.lastMessage?.text || subtitle}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="
                    h-16
                    w-full
                    border-t
                    border-[var(--border-color)]
                    flex
                    items-center
                    justify-center
                    gap-2
                    text-red-400
                    hover:bg-[var(--surface-hover)]
                    transition-colors
                    cursor-pointer
                "
      >
        <LogOut size={18} />
        Logout
      </button>

      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={handleLogout}
      />
    </aside>
  );
};

export default Sidebar;
