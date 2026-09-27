import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    isGroup: {
      type: Boolean,
      default: false,
    },

    groupName: {
      type: String,
      trim: true,
      default: null,
    },

    groupBio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    groupImage: {
      type: String,
      default: null,
    },

    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    groupPhoto: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
