import { MessageCircle, ShieldCheck } from "lucide-react";

const EmptyChat = () => {
  return (
    <div className=" flex-1 flex flex-col items-center justify-center bg-[var(--app-bg)] text-[var(--text-primary)] px-6 text-center">
      <div className=" w-20 h-20 rounded-3xl bg-[var(--surface-bg)] border border-[var(--border-color)] flex items-center justify-center shadow-lg mb-6">
        <MessageCircle size={38} className="text-[var(--accent)]" />
      </div>

      <h2 className="text-2xl font-semibold mb-2">Your Messages</h2>

      <p className="text-sm text-[var(--text-secondary)] max-w-[360px] leading-6">
        Select a conversation from the sidebar to start chatting with your
        friends.
      </p>

      <div className=" mt-8 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <ShieldCheck size={15} />
        Private and secure messaging
      </div>
    </div>
  );
};

export default EmptyChat;
