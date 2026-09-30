import "dotenv/config";

import http from "http";
import { Server } from "socket.io";

import app from "./src/app.js";

import setupSocket from "./src/socket/socket.js";
import { setIO } from "./src/socket/socketManager.js";

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

const allowedOrigins = [
  "https://www.chattalk.website",
  "https://chat-c5u693dei-self-68af.vercel.app",
  "https://chat-app-kappa-ebon-i5ex07h946.vercel.app",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

setupSocket(io);
setIO(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
