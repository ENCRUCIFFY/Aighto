import { useEffect } from "react";
import { Pin, X, PinOff, CornerDownRight, Sparkles } from "lucide-react";
import MessageContent from "./MessageContent";

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function PinnedDrawer({
  isOpen,
  onClose,
  channelName,
  pinnedMessages = [],
  onUnpinMessage,
  onJumpToMessage,
  onOpenImage,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-40 bg-black/80 flex justify-end select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm h-full bg-[var(--bg-main)] border-l border-[var(--border-subtle)] shadow-2xl shadow-black/90 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="h-14 px-5 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] text-[var(--accent-color)]">
              <Pin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Pinned Messages
              </h3>
              <p className="text-[10px] font-mono text-zinc-400">
                #{channelName} • {pinnedMessages.length} pinned
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pinned Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg-main)]">
          {pinnedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-2 text-xs p-6 select-none">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-zinc-400">
                <Sparkles className="w-4 h-4 text-[var(--accent-color)]" />
              </div>
              <p className="font-semibold text-zinc-200">No Pinned Messages</p>
              <p className="text-[11px] text-zinc-400">
                Hover over messages and click the pin icon to keep them saved here.
              </p>
            </div>
          ) : (
            pinnedMessages.map((msg) => {
              const sender = msg.username || msg.user_email?.split("@")[0] || "Operator";
              const initial = sender.slice(0, 2).toUpperCase();

              return (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-card)] transition-all space-y-2.5 group shadow-sm"
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-[9px] font-mono font-bold text-[var(--accent-color)] shrink-0">
                        {initial}
                      </div>
                      <span className="text-xs font-semibold text-zinc-200 truncate">
                        {sender}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 shrink-0">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>

                  {/* Message Content Preview */}
                  <div className="text-xs text-zinc-100 leading-relaxed max-h-40 overflow-y-auto">
                    <MessageContent
                      content={msg.content}
                      onOpenImage={onOpenImage}
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono">
                    <button
                      onClick={() => {
                        onJumpToMessage(msg.id);
                        onClose();
                      }}
                      className="flex items-center gap-1 text-[var(--accent-color)] hover:opacity-80 font-semibold transition cursor-pointer"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Jump to Message</span>
                    </button>

                    <button
                      onClick={() => onUnpinMessage(msg.id)}
                      className="flex items-center gap-1 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                      title="Unpin message"
                    >
                      <PinOff className="w-3.5 h-3.5" />
                      <span>Unpin</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
