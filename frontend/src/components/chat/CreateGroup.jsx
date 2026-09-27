import { useEffect, useMemo, useState } from "react";
import { Search, Users, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getAllUsers } from "../../services/userService";
import { createGroup } from "../../services/chatService";

const CreateGroup = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const data = await getAllUsers();

      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        "Failed to load group members:",
        error.response?.data || error,
      );

      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.username?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword)
      );
    });
  }, [users, search]);

  const isSelected = (userId) => {
    return selectedMembers.some((member) => member._id === userId);
  };

  const handleSelectMember = (user) => {
    setError("");

    setSelectedMembers((prev) => {
      const exists = prev.some((member) => member._id === user._id);

      if (exists) {
        return prev.filter((member) => member._id !== user._id);
      }

      return [...prev, user];
    });
  };

  const handleRemoveMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.filter((member) => member._id !== userId),
    );
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();

    if (!name) {
      setError("Enter a group name.");
      return;
    }

    if (selectedMembers.length < 1) {
      setError("Select at least 1 member.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const memberIds = selectedMembers.map((member) => member._id);

      await createGroup(name, memberIds);

      navigate("/chat");
    } catch (error) {
      console.error("Create group failed:", error.response?.data || error);

      setError(error.response?.data?.message || "Failed to create group.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      <div className="border-b border-zinc-800 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
            <Users size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">Create Group</h1>

            <p className="mt-1 text-sm text-zinc-400">
              Create a conversation with multiple people.
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-800 p-5">
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Group name
        </label>

        <input
          type="text"
          value={groupName}
          onChange={(e) => {
            setGroupName(e.target.value);
            setError("");
          }}
          maxLength={50}
          placeholder="Enter group name..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-indigo-500"
        />

        <div className="mt-2 text-right text-xs text-zinc-500">
          {groupName.length}/50
        </div>
      </div>

      {selectedMembers.length > 0 && (
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">
              Selected members
            </span>

            <span className="text-xs text-zinc-500">
              {selectedMembers.length} selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedMembers.map((member) => (
              <div
                key={member._id}
                className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 py-1.5 pl-2 pr-1.5"
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.username}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {member.username?.charAt(0).toUpperCase()}
                  </div>
                )}

                <span className="max-w-[120px] truncate text-xs text-zinc-200">
                  {member.username}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveMember(member._id)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-zinc-800 p-5">
        <div className="flex items-center rounded-xl bg-zinc-800 px-4 py-3">
          <Search size={18} className="shrink-0 text-zinc-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="ml-3 w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="mt-10 text-center text-zinc-400">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="mt-10 text-center text-zinc-500">No users found.</div>
        ) : (
          filteredUsers.map((user) => {
            const selected = isSelected(user._id);

            return (
              <button
                key={user._id}
                type="button"
                onClick={() => handleSelectMember(user)}
                className={`flex w-full items-center justify-between border-b border-zinc-800 px-6 py-4 text-left transition ${
                  selected ? "bg-indigo-500/10" : "hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="truncate font-medium text-white">
                      {user.username}
                    </h2>

                    <p className="truncate text-sm text-zinc-400">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                    selected
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-zinc-600 text-transparent"
                  }`}
                >
                  <Check size={14} />
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-zinc-800 bg-zinc-900 p-5">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleCreateGroup}
          disabled={creating || !groupName.trim() || selectedMembers.length < 1}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Users size={18} />

          {creating
            ? "Creating Group..."
            : `Create Group${
                selectedMembers.length ? ` (${selectedMembers.length + 1})` : ""
              }`}
        </button>
      </div>
    </div>
  );
};

export default CreateGroup;
