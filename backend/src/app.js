import express from "express";
import cors from "cors";
import connectDb from "./Db/db.js";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";
import chatRoutes from "./routes/chat.route.js";
import otpRoutes from "./routes/otp.routes.js";

import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

const app = express();

connectDb();

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

const allowedOrigins = [
  "http://localhost:5173",
  "https://www.chattalk.website",
  "https://chat-c5u693dei-self-68af.vercel.app",
  "https://chat-app-kappa-ebon-i5ex07h946.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/otp", otpRoutes);

export default app;
