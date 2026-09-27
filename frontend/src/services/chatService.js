import axiosInstance from "../api/axios";

export const getChats = async () => {
  const { data } = await axiosInstance.get("/chats");
  return data;
};

export const getPendingRequests = async () => {
  const { data } = await axiosInstance.get("/chats/requests");
  return data;
};

export const sendChatRequest = async (receiverId) => {
  const { data } = await axiosInstance.post("/chats/request", {
    receiverId,
  });

  return data;
};

export const acceptChatRequest = async (chatId) => {
  const { data } = await axiosInstance.put(`/chats/accept/${chatId}`);

  return data;
};

export const rejectChatRequest = async (chatId) => {
  const { data } = await axiosInstance.delete(`/chats/reject/${chatId}`);

  return data;
};

export const deleteConversation = async (chatId) => {
  return axiosInstance.delete(`/chats/${chatId}`);
};

export const clearConversation = async (chatId) => {
  const { data } = await axiosInstance.delete(`/chats/${chatId}`);

  return data;
};

export const createGroup = async (groupName, members) => {
  const { data } = await axiosInstance.post("/chats/group", {
    groupName,
    members,
  });

  return data;
};

export const addGroupMember = async (groupId, memberId) => {
  const { data } = await axiosInstance.patch("/chats/add-member", {
    groupId,
    memberId,
  });

  return data;
};

export const removeGroupMember = async (groupId, memberId) => {
  const { data } = await axiosInstance.patch("/chats/remove-member", {
    groupId,
    memberId,
  });

  return data;
};

export const leaveGroup = async (groupId) => {
  const { data } = await axiosInstance.patch("/chats/leave-group", {
    groupId,
  });

  return data;
};

export const transferGroupAdmin = async (groupId, newAdminId) => {
  const { data } = await axiosInstance.patch("/chats/transfer-admin", {
    groupId,
    newAdminId,
  });

  return data;
};

export const deleteGroup = async (groupId) => {
  const { data } = await axiosInstance.delete(`/chats/group/${groupId}`);

  return data;
};

export const updateGroupPhoto = async (groupId, file) => {
  const formData = new FormData();

  formData.append("groupId", groupId);
  formData.append("groupPhoto", file);

  const { data } = await axiosInstance.patch("/chats/group-photo", formData);

  return data;
};

export const updateGroupName = async (groupId, groupName) => {
  const { data } = await axiosInstance.patch("/chats/group-name", {
    groupId,
    groupName,
  });

  return data;
};

export const updateGroupBio = async (groupId, groupBio) => {
  const { data } = await axiosInstance.patch("/chats/group-bio", {
    groupId,
    groupBio,
  });

  return data;
};
