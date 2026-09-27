import {
  X,
  Users,
  UserPlus,
  LogOut,
  Trash2,
  Crown,
  Pencil,
  Check,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import AddGroupMemberModal from "./AddGroupMemberModal";
import {
  removeGroupMember,
  transferGroupAdmin,
  updateGroupPhoto,
  leaveGroup,
  deleteGroup,
  updateGroupName,
  updateGroupBio,
} from "../../services/chatService";

const GroupInfoModal = ({ open, onClose }) => {
  const { user } = useAuth();
  const { selectedChat, setSelectedChat, setChats } = useChat();

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");
  const [transferringId, setTransferringId] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);

  const [editingBio, setEditingBio] = useState(false);
  const [newGroupBio, setNewGroupBio] = useState("");
  const [updatingBio, setUpdatingBio] = useState(false);

  if (!open || !selectedChat?.isGroup) {
    return null;
  }

  const participants = selectedChat.participants || [];
  const adminId = selectedChat.groupAdmin?._id || selectedChat.groupAdmin;
  const isAdmin = adminId?.toString() === user?._id?.toString();
  const handleRemoveMember = async (memberId) => {
    if (!selectedChat?._id || !memberId) {
      return;
    }
    const confirmed = window.confirm(
      "Are you sure you want to remove this member?",
    );
    if (!confirmed) {
      return;
    }
    try {
      setRemovingId(memberId);
      setError("");
      const response = await removeGroupMember(selectedChat._id, memberId);
      const updatedGroup = response?.group || response;
      if (!updatedGroup?._id) {
        throw new Error("Updated group was not returned");
      }

      setSelectedChat(updatedGroup);
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
    } catch (error) {
      console.error("Remove member failed:", error.response?.data || error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to remove member",
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleTransferAdmin = async (memberId, username) => {
    if (!selectedChat?._id || !memberId) {
      return;
    }

    const confirmed = window.confirm(
      `Transfer admin rights to ${username || "this member"}?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setTransferringId(memberId);
      const response = await transferGroupAdmin(selectedChat._id, memberId);
      const updatedGroup = response?.group || response;
      setSelectedChat(updatedGroup);

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
    } catch (error) {
      console.error("Transfer admin failed:", error.response?.data || error);
      setError(error.response?.data?.message || "Failed to transfer admin");
    } finally {
      setTransferringId(null);
    }
  };
  const handleGroupPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat?._id) {
      return;
    }
    try {
      setUploadingPhoto(true);
      setError("");
      const data = await updateGroupPhoto(selectedChat._id, file);
      const updatedGroup = data?.group || data;
      setSelectedChat(updatedGroup);
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
      e.target.value = "";
    } catch (error) {
      console.error(
        "Group photo upload failed:",
        error.response?.data || error,
      );
      setError(error.response?.data?.message || "Failed to update group photo");
    } finally {
      setUploadingPhoto(false);
    }
  };
  const handleLeaveGroup = async () => {
    if (!selectedChat?._id) return;
    const groupId = selectedChat._id;
    const confirmed = window.confirm(`Leave "${selectedChat.groupName}"?`);
    if (!confirmed) return;
    try {
      setLeavingGroup(true);
      setError("");
      await leaveGroup(groupId);

      setChats((prev) =>
        prev.filter((chat) => chat._id?.toString() !== groupId.toString()),
      );
      setSelectedChat(null);
      onClose();
    } catch (error) {
      console.error("Leave group failed:", error.response?.data || error);
      setError(error.response?.data?.message || "Failed to leave group");
    } finally {
      setLeavingGroup(false);
    }
  };
  const handleDeleteGroup = async () => {
    if (!selectedChat?._id) return;

    const groupId = selectedChat._id;

    const confirmed = window.confirm(
      `Delete "${selectedChat.groupName}" permanently?\n\nAll group messages will be deleted.`,
    );
    if (!confirmed) return;
    try {
      setDeletingGroup(true);
      setError("");
      await deleteGroup(groupId);
      setChats((prev) =>
        prev.filter((chat) => chat._id?.toString() !== groupId.toString()),
      );
      setSelectedChat(null);
      onClose();
    } catch (error) {
      console.error("Delete group failed:", error.response?.data || error);
      setError(error.response?.data?.message || "Failed to delete group");
    } finally {
      setDeletingGroup(false);
    }
  };
  const handleUpdateGroupName = async () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) {
      setError("Group name cannot be empty");
      return;
    }
    if (trimmedName === selectedChat.groupName) {
      setEditingName(false);
      return;
    }
    try {
      setUpdatingName(true);
      setError("");

      const data = await updateGroupName(selectedChat._id, trimmedName);
      const updatedGroup = data.group;
      setSelectedChat((prev) => ({
        ...prev,
        groupName: updatedGroup.groupName,
      }));

      setChats((prev) =>
        prev.map((chat) =>
          chat._id === selectedChat._id
            ? {
                ...chat,
                groupName: updatedGroup.groupName,
              }
            : chat,
        ),
      );
      setEditingName(false);
      setNewGroupName("");
    } catch (error) {
      console.error("Update group name failed:", error.response?.data || error);
      setError(error.response?.data?.message || "Failed to update group name");
    } finally {
      setUpdatingName(false);
    }
  };
  const handleUpdateGroupBio = async () => {
    if (!selectedChat?._id) return;

    const trimmedBio = newGroupBio.trim();

    if (trimmedBio.length > 500) {
      setError("Group bio cannot exceed 500 characters");
      return;
    }

    try {
      setUpdatingBio(true);
      setError("");

      const data = await updateGroupBio(selectedChat._id, trimmedBio);

      const updatedGroup = data?.group;

      if (!updatedGroup) {
        throw new Error("Updated group was not returned");
      }

      setSelectedChat((prev) => ({
        ...prev,
        ...updatedGroup,
      }));

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

      setEditingBio(false);
      setNewGroupBio("");
    } catch (error) {
      console.error("Update group bio failed:", error.response?.data || error);

      setError(error.response?.data?.message || "Failed to update group bio");
    } finally {
      setUpdatingBio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex h-20 items-center justify-between border-b border-zinc-800 px-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Group Info</h2>
            <p className="text-xs text-zinc-500">Group details and members</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center border-b border-zinc-800 px-6 py-8">
            <div className="relative">
              {selectedChat.groupPhoto ? (
                <img
                  src={selectedChat.groupPhoto}
                  alt={selectedChat.groupName}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600 text-3xl font-bold text-white">
                  {selectedChat.groupName?.charAt(0)?.toUpperCase() || "G"}
                </div>
              )}

              {isAdmin && (
                <>
                  <label
                    htmlFor="group-photo"
                    className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-zinc-900 bg-indigo-600 text-white hover:bg-indigo-500"
                    title="Change group photo"
                  >
                    {uploadingPhoto ? "..." : "✎"}
                  </label>

                  <input
                    id="group-photo"
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={handleGroupPhotoChange}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {editingName ? (
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUpdateGroupName();
                    }

                    if (e.key === "Escape") {
                      setEditingName(false);
                    }
                  }}
                  maxLength={50}
                  autoFocus
                  className="w-52 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-center text-white outline-none focus:border-indigo-500"
                />

                <button
                  onClick={handleUpdateGroupName}
                  disabled={updatingName}
                  className="rounded-full p-2 text-green-400 transition hover:bg-zinc-800 disabled:opacity-50"
                  title="Save group name"
                >
                  <Check size={18} />
                </button>

                <button
                  onClick={() => setEditingName(false)}
                  className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                  title="Cancel"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2">
                <h1 className="text-xl font-semibold text-white">
                  {selectedChat.groupName}
                </h1>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setNewGroupName(selectedChat.groupName || "");
                      setEditingName(true);
                    }}
                    className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                    title="Edit group name"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-zinc-400">
              <Users size={16} />

              <span className="text-sm">
                {participants.length}{" "}
                {participants.length === 1 ? "member" : "members"}
              </span>
            </div>

            <div className="mt-6 w-full rounded-xl bg-zinc-800/70 p-4 text-left">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  About
                </p>

                {isAdmin && !editingBio && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewGroupBio(selectedChat.groupBio || "");
                      setEditingBio(true);
                    }}
                    className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
                    title="Edit group bio"
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>

              {editingBio ? (
                <div>
                  <textarea
                    value={newGroupBio}
                    onChange={(e) =>
                      setNewGroupBio(e.target.value.slice(0, 500))
                    }
                    rows={3}
                    maxLength={500}
                    autoFocus
                    placeholder="Write something about this group..."
                    className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-indigo-500"
                  />

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {newGroupBio.length}/500
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBio(false);
                          setNewGroupBio("");
                        }}
                        disabled={updatingBio}
                        className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-700 hover:text-white disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleUpdateGroupBio}
                        disabled={updatingBio}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {updatingBio ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                  {selectedChat.groupBio?.trim()
                    ? selectedChat.groupBio
                    : "No group bio added yet."}
                </p>
              )}
            </div>
          </div>
          {error && (
            <div className="mx-4 mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="p-4">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAddMemberOpen(true)}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                <UserPlus size={18} />
                Add Member
              </button>
            )}

            <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
              {participants.length}{" "}
              {participants.length === 1 ? "member" : "members"}
            </p>
            <div className="space-y-1">
              {participants.map((member) => {
                const memberId = member?._id || member;
                const memberIsAdmin =
                  memberId?.toString() === adminId?.toString();
                const isMe = memberId?.toString() === user?._id?.toString();
                return (
                  <div
                    key={memberId}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-zinc-800/70 transition"
                  >
                    {member?.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.username || "Member"}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-700 font-semibold text-white">
                        {member?.username?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {isMe ? "You" : member?.username || "User"}
                      </p>

                      <p className="truncate text-xs text-zinc-500">
                        {member?.email}
                      </p>
                    </div>
                    {memberIsAdmin && (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <Crown size={14} />
                        Admin
                      </div>
                    )}

                    {isAdmin && !isMe && !memberIsAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={
                            transferringId?.toString() === memberId?.toString()
                          }
                          onClick={() =>
                            handleTransferAdmin(memberId, member?.username)
                          }
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-400 transition hover:bg-indigo-500/10 disabled:opacity-50"
                        >
                          {transferringId?.toString() === memberId?.toString()
                            ? "Transferring..."
                            : "Make admin"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            removingId?.toString() === memberId?.toString()
                          }
                          onClick={() => handleRemoveMember(memberId)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {removingId?.toString() === memberId?.toString()
                            ? "Removing..."
                            : "Remove"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-800 p-4">
            {!isAdmin && (
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={leavingGroup}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LogOut size={19} />
                <span>{leavingGroup ? "Leaving..." : "Leave group"}</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={deletingGroup}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={19} />
                <span>{deletingGroup ? "Deleting..." : "Delete group"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <AddGroupMemberModal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
      />
    </div>
  );
};
export default GroupInfoModal;
