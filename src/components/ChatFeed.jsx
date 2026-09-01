import { useState, useRef, useEffect, useMemo } from "react";
import {
  Hash,
  Sparkles,
  CornerDownLeft,
  ShieldCheck,
  ArrowDown,
  Copy,
  Check,
  Paperclip,
  Smile,
  X,
  UploadCloud,
  Pin,
  PinOff,
  FileText,
  Trash2,
} from "lucide-react";
import MessageContent from "./MessageContent";
import ImageLightbox from "./ImageLightbox";
import PinnedDrawer from "./PinnedDrawer";

/**
 * Format timestamp to a clean 12-hour format (e.g. "2:45 PM")
 */
function formatTime(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Format full date for date section dividers
 */
function formatDateLabel(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const QUICK_EMOJIS = ["🔥", "💜", "⚡", "👍", "🚀", "😂"];

export default function ChatFeed({
  channelName = "general",
  messages = [],
  reactions = {},
  pinnedMessageIds = [],
  onTogglePin,
  activeDMUser = null,
  onSendMessage,
  onDeleteMessage,
  onToggleReaction,
  currentUser,
  currentUsername = "",
  allProfiles = [],
  typingUsers = {},
  onlineUsers = {},
  onSendTyping,
  isRealtimeConnected = true,
}) {
  const [text, setText] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Memoized map of user UUID to latest display username
  const profileMap = useMemo(() => {
    const map = {};
    for (const p of allProfiles || []) {
      if (p.id) {
        map[p.id] = p.username || p.email?.split("@")[0] || "Operator";
      }
    }
    return map;
  }, [allProfiles]);

  // Active typing users resolution
  const lastTypingSentRef = useRef(0);
  const activeTypingNames = useMemo(() => {
    if (!typingUsers) return [];
    const names = [];
    for (const [userId, info] of Object.entries(typingUsers)) {
      if (userId !== currentUser?.id) {
        const resolvedName = profileMap[userId] || info.username || "User";
        names.push(resolvedName);
      }
    }
    return names;
  }, [typingUsers, currentUser, profileMap]);

  const typingText = useMemo(() => {
    if (activeTypingNames.length === 0) return null;
    if (activeTypingNames.length === 1) return `${activeTypingNames[0]} is typing...`;
    if (activeTypingNames.length === 2) return `${activeTypingNames[0]} and ${activeTypingNames[1]} are typing...`;
    return "Several users are typing...";
  }, [activeTypingNames]);

  // Media, Files & Lightbox state
  const [stagedFile, setStagedFile] = useState(null); // { name, size, isImage, dataUrl }
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null);

  // Pinned Messages state
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);

  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const isAutoScrollingRef = useRef(false);
  const prevMessagesCountRef = useRef(messages.length);

  // Group messages by day and sender continuity
  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate = null;
    let lastSenderId = null;
    let lastTime = null;

    messages.forEach((m) => {
      const msgDate = new Date(m.created_at).toDateString();
      const isNewDate = msgDate !== lastDate;

      if (isNewDate) {
        lastDate = msgDate;
        lastSenderId = null;
        lastTime = null;
      }

      const msgTime = new Date(m.created_at).getTime();
      // Group with previous message if same sender within 5 minutes
      const isContinuous =
        !isNewDate &&
        lastSenderId === m.user_id &&
        lastTime &&
        msgTime - lastTime < 5 * 60 * 1000;

      lastSenderId = m.user_id;
      lastTime = msgTime;

      groups.push({
        ...m,
        isNewDate,
        dateLabel: formatDateLabel(m.created_at),
        isContinuous,
      });
    });

    return groups;
  }, [messages]);

  // List of pinned message objects for this specific room/DM
  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => pinnedMessageIds.includes(m.id));
  }, [messages, pinnedMessageIds]);

  // Smooth scroll to bottom
  const scrollToBottom = (behavior = "smooth") => {
    isAutoScrollingRef.current = true;
    setUnreadCount(0);
    setIsScrolledUp(false);
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 400);
  };

  // Auto-scroll on initial load or new incoming messages
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesCountRef.current;
    prevMessagesCountRef.current = messages.length;

    if (!isScrolledUp) {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: messages.length > 1 ? "smooth" : "auto",
        });
      } else {
        messagesEndRef.current?.scrollIntoView({
          behavior: messages.length > 1 ? "smooth" : "auto",
        });
      }
    } else if (isNewMessage) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages, isScrolledUp]);

  // Monitor scroll position to show/hide "Jump to latest"
  const handleScroll = () => {
    if (isAutoScrollingRef.current || !containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const scrolledUp = distanceFromBottom > 120;
    setIsScrolledUp(scrolledUp);
    if (!scrolledUp) {
      setUnreadCount(0);
    }
  };

  // Handle Drag & Drop Images/Files
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file) => {
    const reader = new FileReader();
    const isImage = file.type.startsWith("image/");
    reader.onload = (loadEvt) => {
      setStagedFile({
        name: file.name,
        size: formatFileSize(file.size),
        isImage,
        dataUrl: loadEvt.target.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (onSendTyping) {
      if (val.trim().length > 0) {
        const now = Date.now();
        if (now - lastTypingSentRef.current > 2000) {
          lastTypingSentRef.current = now;
          onSendTyping(true);
        }
      } else {
        lastTypingSentRef.current = 0;
        onSendTyping(false);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSendTyping) {
      lastTypingSentRef.current = 0;
      onSendTyping(false);
    }
    let messageContent = text.trim();

    if (stagedFile) {
      if (stagedFile.isImage) {
        const imgMarkdown = `![${stagedFile.name}](${stagedFile.dataUrl})`;
        messageContent = messageContent ? `${messageContent}\n\n${imgMarkdown}` : imgMarkdown;
      } else {
        const fileMarkdown = `[file:${stagedFile.name}:${stagedFile.size}](${stagedFile.dataUrl})`;
        messageContent = messageContent ? `${messageContent}\n\n${fileMarkdown}` : fileMarkdown;
      }
      setStagedFile(null);
    }

    if (!messageContent) return;

    onSendMessage(messageContent);
    setText("");
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  const handleCopy = (id, content) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTogglePin = (msgId) => {
    if (onTogglePin) {
      onTogglePin(msgId);
    }
  };

  // Auto-close emoji popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!emojiPickerMsgId) return;
    const handleClickOutside = (e) => {
      if (!e.target?.closest || !e.target.closest('[data-emoji-picker="true"]')) {
        setEmojiPickerMsgId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setEmojiPickerMsgId(null);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [emojiPickerMsgId]);

  const handleJumpToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(msgId);
      setTimeout(() => setHighlightedMsgId(null), 2500);
    }
  };

  const handleAddReaction = (msgId, emoji) => {
    if (onToggleReaction) {
      onToggleReaction(msgId, emoji);
    }
    setEmojiPickerMsgId(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full bg-[var(--bg-main)] rounded-2xl border border-[var(--border-card)] overflow-hidden relative min-w-0"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-[var(--bg-main)]/95 border-2 border-dashed border-[var(--accent-color)] rounded-2xl flex flex-col items-center justify-center gap-3 select-none">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-color)] shadow-2xl">
            <UploadCloud className="w-8 h-8" />
          </div>
          <p className="text-sm font-semibold text-white tracking-wide">
            Drop file or image to upload to #{channelName}
          </p>
          <p className="text-xs text-zinc-400">
            Encrypted Instant Universal File Drop
          </p>
        </div>
      )}

      {/* Top Header Island */}
      <div className="h-12 md:h-14 px-3 md:px-6 border-b border-[var(--border-card)] bg-[var(--bg-card)] flex items-center justify-between shrink-0 z-10 select-none">
        <div className="flex items-center gap-3 min-w-0">
          {activeDMUser ? (
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-zinc-100 shadow-sm">
                {(activeDMUser.username || activeDMUser.id).slice(0, 2).toUpperCase()}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--bg-card)] translate-x-0.5 translate-y-0.5 ${
                  (onlineUsers[activeDMUser.id] || "offline") === "online"
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                    : (onlineUsers[activeDMUser.id] || "offline") === "away"
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                    : "bg-zinc-600 ring-[var(--bg-card)]"
                }`}
                title={`Status: ${onlineUsers[activeDMUser.id] || "offline"}`}
              />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 shadow-sm shrink-0">
              <Hash className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          )}
          <div className="truncate min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider truncate">
                {activeDMUser ? `@${activeDMUser.username || activeDMUser.id.slice(0, 8)}` : channelName}
              </h2>
              {activeDMUser ? (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono border flex items-center gap-1 shrink-0 ${
                    (onlineUsers[activeDMUser.id] || "offline") === "online"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : (onlineUsers[activeDMUser.id] || "offline") === "away"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-white/5 border-white/10 text-zinc-400"
                  }`}
                >
                  <span
                    className={`w-1 h-1 rounded-full ${
                      (onlineUsers[activeDMUser.id] || "offline") === "online"
                        ? "bg-emerald-400"
                        : (onlineUsers[activeDMUser.id] || "offline") === "away"
                        ? "bg-amber-400"
                        : "bg-zinc-500"
                    }`}
                  />
                  {(onlineUsers[activeDMUser.id] || "offline").toUpperCase()}
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-zinc-400 shrink-0">
                  #PUBLIC
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header: Pinned Drawer Trigger & Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Pinned Messages Button */}
          <button
            onClick={() => setIsPinnedDrawerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition cursor-pointer shadow-sm ${
              isPinnedDrawerOpen || pinnedMessages.length > 0
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
            title="View Pinned Messages"
          >
            <Pin className="w-3.5 h-3.5 text-[var(--accent-color)]" />
            <span className="hidden sm:inline">Pinned</span>
            {pinnedMessages.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--accent-color)] text-[var(--accent-text)] text-[9px] font-bold flex items-center justify-center">
                {pinnedMessages.length}
              </span>
            )}
          </button>

          {/* Realtime Status Indicator */}
          <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRealtimeConnected
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-zinc-300 hidden md:inline">
                {isRealtimeConnected ? "Connected" : "Connecting..."}
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              <span>E2EE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Feed Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 p-3 md:p-6 overflow-y-auto space-y-3 relative scroll-smooth bg-[var(--bg-main)] touch-momentum"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-3 text-xs select-none p-6">
            {activeDMUser ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center text-base font-mono font-bold text-zinc-100 shadow-xl">
                  {(activeDMUser.username || activeDMUser.id).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-zinc-100 text-sm">
                    Direct Message with @{activeDMUser.username || activeDMUser.id.slice(0, 8)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
                    This is the start of your private, encrypted 1-on-1 direct message stream. Messages and files shared here are strictly private.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 shadow-lg">
                  <Sparkles className="w-5 h-5 text-[var(--accent-color)]" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-200">Stream Initialized</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Channel #{channelName} is live. Send messages, code snippets, or files.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          groupedMessages.map((m) => {
            const isSelf = m.user_id === currentUser?.id;
            const sender = isSelf
              ? currentUsername || m.username || currentUser?.user_metadata?.username || currentUser?.email?.split("@")[0] || "Operator"
              : (m.user_id && profileMap[m.user_id]) || m.username || m.user_email?.split("@")[0] || "Operator";
            const initial = sender.slice(0, 2).toUpperCase();
            const msgReactions = reactions[m.id] || {};
            const isPinned = pinnedMessageIds.includes(m.id);
            const isHighlighted = highlightedMsgId === m.id;

            return (
              <div
                key={m.id}
                id={`msg-${m.id}`}
                className={`flex flex-col transition-all duration-300 rounded-2xl ${
                  isHighlighted ? "p-1.5 bg-[var(--accent-muted)] ring-2 ring-[var(--accent-border)] shadow-2xl" : ""
                }`}
              >
                {/* Date Divider */}
                {m.isNewDate && (
                  <div className="flex items-center justify-center my-4">
                    <div className="h-[1px] flex-1 bg-white/10" />
                    <span className="px-3 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] text-[10px] font-mono text-zinc-400 shadow-sm mx-3">
                      {m.dateLabel}
                    </span>
                    <div className="h-[1px] flex-1 bg-white/10" />
                  </div>
                )}

                {/* Message Bubble Block */}
                <div
                  className={`flex items-end gap-2.5 ${
                    isSelf ? "flex-row-reverse" : "flex-row"
                  } group relative ${m.isContinuous ? "mt-1" : "mt-3"}`}
                >
                  {/* Avatar Chip for Peer Messages */}
                  {!isSelf && (
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                      {!m.isContinuous ? (
                        <div
                          className="w-7 h-7 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-zinc-200 shadow-md select-none"
                          title={sender}
                        >
                          {initial}
                        </div>
                      ) : (
                        <div className="w-7" />
                      )}
                    </div>
                  )}

                  {/* Bubble Content Body */}
                  <div
                    className={`flex flex-col max-w-[85%] md:max-w-[75%] ${
                      isSelf ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Header: Sender, Timestamp & Pinned Indicator */}
                    {!m.isContinuous && (
                      <div
                        className={`flex items-center gap-2 mb-1 px-1 text-[11px] font-mono ${
                          isSelf ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <span className="font-semibold text-zinc-200 tracking-tight">
                          {isSelf ? "You" : sender}
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          {formatTime(m.created_at)}
                        </span>
                        {isPinned && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[var(--accent-color)] px-1.5 py-0.5 rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)]">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                          </span>
                        )}
                      </div>
                    )}

                    {/* Modern Message Capsule */}
                    <div className="relative group/bubble">
                      <div
                        className={`px-4 py-2.5 text-xs leading-relaxed transition-all duration-200 select-text ${
                          isSelf
                            ? "bg-[var(--accent-color)] text-[var(--accent-text)] rounded-2xl rounded-tr-xs border border-[var(--accent-border)] shadow-md shadow-black/20 hover:opacity-95"
                            : "bg-[var(--bg-card)] text-zinc-100 rounded-2xl rounded-tl-xs border border-[var(--border-card)] shadow-sm hover:border-white/20"
                        }`}
                      >
                        <MessageContent
                          content={m.content}
                          onOpenImage={(url) => setLightboxImage(url)}
                        />
                      </div>

                      {/* Floating Micro Action Toolbar on Bubble Hover */}
                      <div
                        className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 z-10 flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-popover)] border border-[var(--border-card)] shadow-xl ${
                          isSelf ? "left-0 -translate-x-full mr-2" : "right-0 translate-x-full ml-2"
                        }`}
                      >
                        {/* Quick Emoji Reaction Trigger */}
                        <div className="relative" data-emoji-picker="true">
                          <button
                            onClick={() =>
                              setEmojiPickerMsgId(emojiPickerMsgId === m.id ? null : m.id)
                            }
                            data-emoji-picker="true"
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                            title="Add reaction"
                          >
                            <Smile className="w-3 h-3" />
                          </button>

                          {/* Quick Emoji Popover */}
                          {emojiPickerMsgId === m.id && (
                            <div
                              data-emoji-picker="true"
                              className="absolute bottom-full left-0 mb-1.5 p-1.5 rounded-xl bg-[var(--bg-popover)] border border-[var(--border-card)] shadow-2xl flex items-center gap-1 z-30 animate-in zoom-in-95 duration-100"
                            >
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  data-emoji-picker="true"
                                  onClick={() => handleAddReaction(m.id, emoji)}
                                  className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-xs transition cursor-pointer hover:scale-125 active:scale-95"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pin / Unpin Button */}
                        <button
                          onClick={() => handleTogglePin(m.id)}
                          className={`p-1 rounded transition cursor-pointer ${
                            isPinned
                              ? "text-[var(--accent-color)] hover:text-rose-400 hover:bg-white/10"
                              : "text-zinc-400 hover:text-white hover:bg-white/10"
                          }`}
                          title={isPinned ? "Unpin message" : "Pin message"}
                        >
                          {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>

                        <button
                          onClick={() => handleCopy(m.id, m.content)}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                          title="Copy message"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        {/* Delete Button (Author Only) */}
                        {isSelf && onDeleteMessage && (
                          <button
                            onClick={() => onDeleteMessage(m.id)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reaction Pills Bar */}
                    {Object.keys(msgReactions).length > 0 && (
                      <div className="flex items-center gap-1 mt-1 px-1 flex-wrap">
                        {Object.entries(msgReactions).map(([emoji, users]) => {
                          const userList = Array.isArray(users) ? users : [];
                          const count = userList.length;
                          const hasUserReacted = userList.includes(currentUser?.id || "");

                          if (count <= 0) return null;

                          return (
                            <button
                              key={emoji}
                              onClick={() => handleAddReaction(m.id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono transition cursor-pointer shadow-sm ${
                                hasUserReacted
                                  ? "bg-[var(--accent-muted)] border border-[var(--accent-border)] text-white font-semibold"
                                  : "bg-white/5 border border-white/10 text-zinc-300 hover:border-white/20"
                              }`}
                              title={hasUserReacted ? "Click to remove reaction" : "Click to add reaction"}
                            >
                              <span>{emoji}</span>
                              <span className={hasUserReacted ? "text-[var(--accent-color)] font-bold" : "text-zinc-400"}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Continuous timestamp on hover if header was omitted */}
                    {m.isContinuous && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-mono text-zinc-500 px-1 mt-0.5">
                        {formatTime(m.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Floating "Jump to Latest" Capsule */}
      {isScrolledUp && (
        <div className="absolute bottom-20 right-8 z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => scrollToBottom("smooth")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-popover)] border border-[var(--border-card)] text-zinc-100 shadow-xl shadow-black/80 hover:opacity-90 text-xs font-mono transition cursor-pointer active:scale-95"
          >
            <ArrowDown className="w-3.5 h-3.5 text-[var(--accent-color)]" />
            <span>Latest Messages</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-color)] text-[var(--accent-text)] text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Staged File Pending Upload Pill (Image or General File) */}
      {stagedFile && (
        <div className="px-4 py-2 bg-[var(--bg-input)] border-t border-[var(--border-card)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {stagedFile.isImage ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/15 bg-black">
                <img
                  src={stagedFile.dataUrl}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-[var(--accent-color)]">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-white truncate max-w-xs">
                {stagedFile.name}
              </p>
              <span className="text-[10px] font-mono text-zinc-400">
                {stagedFile.size} • Ready to upload
              </span>
            </div>
          </div>
          <button
            onClick={() => setStagedFile(null)}
            className="p-1 rounded-lg hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Capsule Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 md:p-4 bg-[var(--bg-card)] border-t border-[var(--border-card)] shrink-0 relative pb-safe"
      >
        {/* Floating Typing Indicator */}
        {typingText && (
          <div className="absolute -top-5 left-5 z-20 flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 animate-in fade-in slide-in-from-bottom-1 duration-150 select-none pointer-events-none drop-shadow-md">
            <span className="flex items-center gap-0.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-bounce" />
            </span>
            <span className="truncate">{typingText}</span>
          </div>
        )}

        <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-card)] focus-within:border-[var(--accent-color)] focus-within:ring-1 focus-within:ring-[var(--accent-muted)] transition-all">
          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition cursor-pointer shrink-0"
            title="Attach file or image (or drag & drop)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder={`Message #${channelName}... (supports \`\`\`code\`\`\`, ||spoiler||, **bold**)`}
            value={text}
            onChange={handleInputChange}
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none"
          />

          <button
            type="submit"
            disabled={!text.trim() && !stagedFile}
            className="p-2 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] disabled:bg-zinc-800 disabled:text-zinc-600 text-[var(--accent-text)] transition flex items-center justify-center shadow-md cursor-pointer disabled:cursor-not-allowed active:scale-95"
            title="Send Message (Enter)"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Fullscreen Image Lightbox Modal */}
      <ImageLightbox
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Pinned Messages Slide-Over Drawer */}
      <PinnedDrawer
        isOpen={isPinnedDrawerOpen}
        onClose={() => setIsPinnedDrawerOpen(false)}
        channelName={channelName}
        pinnedMessages={pinnedMessages}
        onUnpinMessage={handleTogglePin}
        onJumpToMessage={handleJumpToMessage}
        onOpenImage={(url) => setLightboxImage(url)}
      />
    </div>
  );
}