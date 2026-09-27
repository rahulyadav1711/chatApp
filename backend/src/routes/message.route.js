import express from "express";
import messageController from "../controller/message.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/send", authMiddleware, messageController.sendMessage);

router.post("/group/send", authMiddleware, messageController.sendGroupMessage);

router.get(
  "/group/:chatId",
  authMiddleware,
  messageController.getGroupMessages,
);

router.get(
  "/:senderId/:receiverId",
  authMiddleware,
  messageController.getMessages,
);

router.patch("/seen/:messageId", authMiddleware, messageController.markAsSeen);

router.post(
  "/image",
  authMiddleware,
  upload.single("image"),
  messageController.sendImage,
);

router.post(
  "/file",
  authMiddleware,
  upload.single("file"),
  messageController.sendFile,
);

router.patch(
  "/delete/:messageId",
  authMiddleware,
  messageController.deleteMessage,
);

router.patch(
  "/delete-for-me/:messageId",
  authMiddleware,
  messageController.deleteForMe,
);

router.patch("/edit/:messageId", authMiddleware, messageController.editMessage);

router.post(
  "/voice",
  authMiddleware,
  upload.single("audio"),
  messageController.sendVoice,
);

router.put("/seen/:messageId", authMiddleware, messageController.markAsSeen);

router.put(
  "/reset-unread/:chatId",
  authMiddleware,
  messageController.resetUnreadCount,
);

router.patch(
  "/reaction/:messageId",
  authMiddleware,
  messageController.reactToMessage,
);

export default router;
