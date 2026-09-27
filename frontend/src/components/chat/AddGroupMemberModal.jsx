import { Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getAllUsers } from "../../services/userService";
import { addGroupMember } from "../../services/chatService";
import { useChat } from "../../context/ChatContext";

const AddGroupMemberModal = ({ open, onClose }) => {
  const { selectedChat, setSelectedChat, setChats } = useChat();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getAllUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load users:", error);
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setError("");
      setAddingId(null);
    }
  }, [open]);

  const currentMemberIds = useMemo(() => {
    return new Set(
      (selectedChat?.participants || []).map((member) =>
        (member?._id || member)?.toString(),
      ),
    );
  }, [selectedChat]);

  const availableUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      if (currentMemberIds.has(user._id?.toString())) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return (
        user.username?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword)
      );
    });
  }, [users, search, currentMemberIds]);

  const handleAdd = async (memberId) => {
    if (!selectedChat?._id) return;
    try {
      setAddingId(memberId);
      setError("");
      const response = await addGroupMember(selectedChat._id, memberId);
      const updatedGroup = response?.group;
      if (!updatedGroup) {
        throw new Error("Updated group was not returned");
      }

      setSelectedChat(updatedGroup);

      setChats((prev) =>
        prev.map((chat) =>
          chat._id?.toString() === updatedGroup._id?.toString()
            ? updatedGroup
            : chat,
        ),
      );

      setUsers((prev) =>
        prev.filter((user) => user._id?.toString() !== memberId.toString()),
      );
    } catch (error) {
      console.error("Add member failed:", error.response?.data || error);
      setError(error.response?.data?.message || "Failed to add member");
    } finally {
      setAddingId(null);
    }
  };
  if (!open || !selectedChat?.isGroup) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-162.5 w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Add member</h2>

            <p className="mt-1 text-xs text-zinc-500">
              Add someone to {selectedChat.groupName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-zinc-800 p-4">
          <div className="flex items-center rounded-xl bg-zinc-800 px-4">
            <Search size={18} className="text-zinc-500" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="py-10 text-center text-sm text-zinc-500">
              Loading users...
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">
              No users available
            </div>
          ) : (
            availableUsers.map((candidate) => (
              <div
                key={candidate._id}
                className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-zinc-800"
              >
                {candidate.avatar ? (
                  <img
                    src={candidate.avatar}
                    alt={candidate.username}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                    {candidate.username?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {candidate.username}
                  </p>

                  <p className="truncate text-xs text-zinc-500">
                    {candidate.email}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={addingId === candidate._id}
                  onClick={() => handleAdd(candidate._id)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus size={16} />

                  {addingId === candidate._id ? "Adding..." : "Add"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AddGroupMemberModal;
