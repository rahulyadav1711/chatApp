import express from "express";
import chatController from "../controller/chat.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, chatController.getChats);
router.post("/request", authMiddleware, chatController.sendChatRequest);

router.put("/accept/:chatId", authMiddleware, chatController.acceptChatRequest);
router.get("/requests", authMiddleware, chatController.getPendingRequests);
router.delete(
  "/reject/:chatId",
  authMiddleware,
  chatController.rejectChatRequest,
);

router.post("/group", authMiddleware, chatController.createGroup);
router.patch("/add-member", authMiddleware, chatController.addMember);
router.patch("/remove-member", authMiddleware, chatController.removeMember);
router.patch("/leave-group", authMiddleware, chatController.leaveGroup);
router.patch("/transfer-admin", authMiddleware, chatController.transferAdmin);
router.patch(
  "/group-photo",
  authMiddleware,
  upload.single("groupPhoto"),
  chatController.updateGroupPhoto,
);
router.delete("/group/:groupId", authMiddleware, chatController.deleteGroup);
router.patch("/group-name", authMiddleware, chatController.updateGroupName);
router.patch("/group-bio", authMiddleware, chatController.updateGroupBio);

router.delete("/:chatId", authMiddleware, chatController.deleteConversation);
export default router;
