import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  Hash,
  Volume2,
  Maximize2,
  PhoneOff,
  PanelLeft,
  LogOut,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function CommandPalette({
  isOpen,
  onClose,
  channels = [],
  activeChannel,
  onSelectChannel,
  activeVoice,
  onJoinVoice,
  onDisconnectVoice,
  isViewingStage,
  onToggleStageView,
  isSidebarCollapsed,
  onToggleSidebar,
  onSignOut,
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  // Keyboard escape handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Build command items
  const allItems = useMemo(() => {
    const items = [];

    // Text Channels
    channels
      .filter((c) => c.type !== "voice")
      .forEach((ch) => {
        items.push({
          id: `channel-${ch.id}`,
          category: "Channels",
          title: `# ${ch.name}`,
          subtitle: "Switch to text channel",
          icon: Hash,
          action: () => {
            onSelectChannel(ch);
            handleClose();
          },
          isActive: activeChannel?.id === ch.id,
        });
      });

    // Voice Rooms
    const voiceRooms = [
      { id: "General Voice", name: "General Voice", bitrate: "HD WebRTC Mesh" },
    ];

    voiceRooms.forEach((v) => {
      const isCurrent = activeVoice === v.id;
      items.push({
        id: `voice-${v.id}`,
        category: "Audio Mesh",
        title: v.name,
        subtitle: isCurrent ? "Currently Connected" : `Join voice stage (${v.bitrate})`,
        icon: Volume2,
        action: () => {
          onJoinVoice(v.id);
          handleClose();
        },
        isActive: isCurrent,
      });
    });

    // Voice & Stage Controls (if connected)
    if (activeVoice) {
      items.push({
        id: "action-stage",
        category: "Mesh Controls",
        title: isViewingStage ? "Minimize Voice Stage" : "Expand to Voice Stage",
        subtitle: "Toggle stage video grid view",
        icon: Maximize2,
        action: () => {
          onToggleStageView?.();
          handleClose();
        },
      });

      items.push({
        id: "action-leave",
        category: "Mesh Controls",
        title: "Leave Audio Mesh",
        subtitle: `Disconnect from ${activeVoice}`,
        icon: PhoneOff,
        danger: true,
        action: () => {
          onDisconnectVoice?.();
          handleClose();
        },
      });
    }

    // System Navigation
    items.push({
      id: "action-sidebar",
      category: "Workspace",
      title: isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar",
      subtitle: "Toggle slim rail navigation mode",
      icon: PanelLeft,
      action: () => {
        onToggleSidebar?.();
        handleClose();
      },
    });

    items.push({
      id: "action-logout",
      category: "Workspace",
      title: "Sign Out",
      subtitle: "End current session",
      icon: LogOut,
      danger: true,
      action: () => {
        onSignOut?.();
        handleClose();
      },
    });

    return items;
  }, [
    channels,
    activeChannel,
    onSelectChannel,
    activeVoice,
    onJoinVoice,
    onDisconnectVoice,
    isViewingStage,
    onToggleStageView,
    isSidebarCollapsed,
    onToggleSidebar,
    onSignOut,
    handleClose,
  ]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const cleanQuery = query.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(cleanQuery) ||
        item.subtitle.toLowerCase().includes(cleanQuery) ||
        item.category.toLowerCase().includes(cleanQuery)
    );
  }, [allItems, query]);

  // Keyboard navigation inside the palette
  const handleInputKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 md:pt-20 px-3 md:px-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/80"
      />

      {/* Floating Bento Palette Box */}
      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-main)] border border-[var(--border-card)] shadow-2xl shadow-black/90 overflow-hidden z-10 flex flex-col">
        
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a channel, audio room, or action..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400 hover:text-white transition cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-72 overflow-y-auto p-2 space-y-1 bg-[var(--bg-main)]"
        >
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
              <Sparkles className="w-5 h-5 text-zinc-600" />
              <p>No matching channels or actions found</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === index;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected
                      ? item.danger
                        ? "bg-rose-950/40 border border-rose-500/30 text-rose-200"
                        : "bg-[var(--accent-muted)] border border-[var(--accent-border)] text-white"
                      : "text-zinc-400 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`p-1.5 rounded-lg ${
                        item.danger
                          ? "bg-rose-950/60 text-rose-400"
                          : isSelected
                          ? "bg-[var(--accent-muted)] text-[var(--accent-color)]"
                          : "bg-white/5 text-zinc-400"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100 truncate">
                          {item.title}
                        </span>
                        {item.isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 truncate block">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 shrink-0 ml-2">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                      {item.category}
                    </span>
                    {isSelected && (
                      <ArrowRight className="w-3 h-3 text-zinc-300 ml-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Tip */}
        <div className="px-4 py-2 border-t border-white/10 bg-[#0d0d11] flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>Click to select • Navigate with ↑ ↓</span>
          <span>Aighto Command Palette</span>
        </div>
      </div>
    </div>
  );
}
