import { useEffect, useRef } from "react";
import {
  Settings,
  LogOut,
  CircleDot,
  Sparkles,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAppVersion } from "../version";

export default function ProfilePopover({
  isOpen,
  onClose,
  user,
  currentUsername = "",
  userStatus = "online",
  isCollapsed,
  onOpenSettings,
  onSignOut,
}) {
  const version = useAppVersion();
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (e.target?.closest && e.target.closest('[data-profile-trigger="true"]')) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const username =
    currentUsername ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Operator";
  const initials = username.slice(0, 2).toUpperCase();

  // Position calculation
  const style = isCollapsed
    ? {
        left: "80px",
        bottom: "16px",
      }
    : {
        left: "16px",
        bottom: "64px",
      };

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-50 w-64 rounded-2xl bg-[var(--bg-popover)] border border-[var(--border-card)] p-3.5 shadow-2xl shadow-black/90 text-zinc-100 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header Profile Section */}
      <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-sm font-mono font-bold text-[var(--accent-color)] shadow-lg shrink-0">
            {initials}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate tracking-tight">
              {username}
            </p>
            <span
              className={`text-[10px] font-mono flex items-center gap-1.5 mt-0.5 ${
                userStatus === "away" ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              <CircleDot
                className={`w-2 h-2 fill-current ${
                  userStatus === "away" ? "text-amber-400" : "text-emerald-400"
                }`}
              />
              {userStatus === "away" ? "Away (Idle 5m+)" : "Online & Active"}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Profile Email & Badge */}
      <div className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] mb-3 flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[170px]">
          {user?.email || "Encrypted Session"}
        </span>
        <ShieldCheck className="w-3 h-3 text-[var(--accent-color)] shrink-0" />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => {
            onClose();
            onOpenSettings();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-zinc-200 hover:text-white bg-transparent hover:bg-[var(--accent-muted)] border border-transparent hover:border-[var(--accent-border)] transition cursor-pointer text-left group"
        >
          <Settings className="w-3.5 h-3.5 text-[var(--accent-color)] group-hover:scale-110 transition-transform" />
          <span>Preferences & Settings</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-rose-300 hover:text-rose-100 bg-transparent hover:bg-rose-950/40 border border-transparent hover:border-rose-800/30 transition cursor-pointer text-left"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Footer Tag */}
      <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[9px] font-mono text-zinc-500 px-1">
        <span className="flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-[var(--accent-color)]" /> Aighto
        </span>
        <span>v{version}</span>
      </div>
    </div>
  );
}
