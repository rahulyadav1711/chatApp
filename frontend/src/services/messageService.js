import axiosInstance from "../api/axios";

export const getMessages = async (senderId, receiverId) => {
  const { data } = await axiosInstance.get(
    `/messages/${senderId}/${receiverId}`,
  );

  return data;
};

export const sendMessage = async (messageData) => {
  const { data } = await axiosInstance.post("/messages/send", messageData);

  return data;
};

export const markAsSeen = async (messageId) => {
  const { data } = await axiosInstance.put(`/messages/seen/${messageId}`);

  return data;
};

export const resetUnread = async (chatId) => {
  const { data } = await axiosInstance.put(`/messages/reset-unread/${chatId}`);

  return data;
};

export const deleteMessage = async (messageId) => {
  const { data } = await axiosInstance.patch(`/messages/delete/${messageId}`);

  return data;
};

export const deleteForMe = async (messageId) => {
  const { data } = await axiosInstance.patch(
    `/messages/delete-for-me/${messageId}`,
  );

  return data;
};

export const editMessage = async (messageId, text) => {
  const response = await axiosInstance.patch(`/messages/edit/${messageId}`, {
    text,
  });

  return response.data;
};

export const reactToMessage = async (messageId, emoji) => {
  const { data } = await axiosInstance.patch(
    `/messages/reaction/${messageId}`,
    {
      emoji,
    },
  );

  return data;
};

export const sendGroupMessage = async (messageData) => {
  const { data } = await axiosInstance.post(
    "/messages/group/send",
    messageData,
  );

  return data;
};

export const getGroupMessages = async (chatId) => {
  const { data } = await axiosInstance.get(`/messages/group/${chatId}`);

  return data;
};

export const sendImage = async ({
  file,
  receiverId = null,
  chatId = null,
  caption = "",
  replyTo = null,
}) => {
  if (!file) {
    throw new Error("Image file is required");
  }

  const formData = new FormData();

  formData.append("image", file);

  if (receiverId) {
    formData.append("receiverId", receiverId.toString());
  }

  if (chatId) {
    formData.append("chatId", chatId.toString());
  }

  if (caption?.trim()) {
    formData.append("caption", caption.trim());
  }

  if (replyTo) {
    formData.append("replyTo", replyTo.toString());
  }

  const { data } = await axiosInstance.post("/messages/image", formData);

  return data;
};

export const sendFile = async ({
  file,
  receiverId = null,
  chatId = null,
  replyTo = null,
}) => {
  if (!file) {
    throw new Error("File is required");
  }

  const formData = new FormData();

  formData.append("file", file);

  if (receiverId) {
    formData.append("receiverId", receiverId.toString());
  }

  if (chatId) {
    formData.append("chatId", chatId.toString());
  }

  if (replyTo) {
    formData.append("replyTo", replyTo.toString());
  }

  const { data } = await axiosInstance.post("/messages/file", formData);

  return data;
};

export const sendVoice = async ({
  file,
  receiverId = null,
  chatId = null,
  replyTo = null,
}) => {
  if (!file) {
    throw new Error("Audio file is required");
  }

  const formData = new FormData();

  formData.append("audio", file);

  if (receiverId) {
    formData.append("receiverId", receiverId.toString());
  }

  if (chatId) {
    formData.append("chatId", chatId.toString());
  }

  if (replyTo) {
    formData.append("replyTo", replyTo.toString());
  }

  const { data } = await axiosInstance.post("/messages/voice", formData);

  return data;
};
