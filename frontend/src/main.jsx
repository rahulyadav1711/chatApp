import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { SocketProvider } from "./context/SocketContext";
import { CallProvider } from "./context/CallContext";
import { MessageMenuProvider } from "./context/MessageMenuContext";

import { Toaster } from "react-hot-toast";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <SocketProvider>
            <CallProvider>
              <MessageMenuProvider>
                <App />

                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 2500,

                    style: {
                      background: "var(--surface-bg)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                    },

                    success: {
                      duration: 2200,
                    },

                    error: {
                      duration: 3500,
                    },
                  }}
                />
              </MessageMenuProvider>
            </CallProvider>
          </SocketProvider>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>,
);
