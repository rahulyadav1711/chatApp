import { Moon, Bell, Shield, LogOut, Sun, Sparkles, Check } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Modal from "../Common/Modal";
import { useState } from "react";

const SettingsModal = ({ isOpen, onClose, onLogout }) => {
  const { theme, changeTheme } = useTheme();
  const [showAppearance, setShowAppearance] = useState(false);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-3">
        <div>
          <button
            type="button"
            onClick={() => setShowAppearance((prev) => !prev)}
            className="w-full flex items-center gap-4 bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-xl p-4 transition cursor-pointer"
          >
            <Moon />
            <span>Appearance</span>
            <span className="ml-auto text-xs text-[var(--text-secondary)] capitalize">
              {theme}
            </span>
          </button>
          {showAppearance && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                type="button"
                onClick={() => changeTheme("dark")}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition
                    ${
                      theme === "dark"
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-[var(--border-color)] hover:bg-[var(--surface-hover)]"
                    }
                `}
              >
                <Moon size={20} />
                <span className="text-sm text-[var(--text-primary)]">Dark</span>
                {theme === "dark" && (
                  <Check
                    size={14}
                    className="absolute top-2 right-2 text-indigo-500"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => changeTheme("light")}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition
                    ${
                      theme === "light"
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-[var(--border-color)] hover:bg-[var(--surface-hover)]"
                    }
                `}
              >
                <Sun size={20} />
                <span className="text-sm text-[var(--text-primary)]">
                  Light
                </span>
                {theme === "light" && (
                  <Check
                    size={14}
                    className="absolute top-2 right-2 text-indigo-500"
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => changeTheme("midnight")}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition
                    ${
                      theme === "midnight"
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-[var(--border-color)] hover:bg-[var(--surface-hover)]"
                    }
                `}
              >
                <Sparkles size={20} />

                <span className="text-sm text-[var(--text-primary)]">
                  Midnight
                </span>

                {theme === "midnight" && (
                  <Check
                    size={14}
                    className="absolute top-2 right-2 text-indigo-500"
                  />
                )}
              </button>
            </div>
          )}
        </div>

        <button className="w-full flex items-center gap-4 bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)] rounded-xl p-4 transition text-[var(--text-primary)] cursor-pointer ">
          <Bell />
          <span>Notifications</span>
        </button>

        <button className="w-full flex items-center gap-4 bg-[var(--surface-bg)] hover:bg-[var(--surface-hover)] rounded-xl p-4 transition text-[var(--text-primary)] cursor-pointer ">
          <Shield />
          <span>Privacy</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 bg-red-600 hover:bg-red-700 rounded-xl p-4 transition text-white"
        >
          <LogOut />
          Logout
        </button>
      </div>
    </Modal>
  );
};

export default SettingsModal;
