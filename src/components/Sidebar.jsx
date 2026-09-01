import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  MessageSquare,
  Compass,
  Radio,
  UserPlus,
  Hash,
  Settings,
  CircleDot,
  Music,
  Play,
  Pause,
  SkipForward,
  X,
} from "lucide-react";
import { useMusicPlayer } from "../MusicPlayerContext";
import MusicPlayerPopover from "./MusicPlayerPopover";
import AightoLogo from "./AightoLogo";

export default function Sidebar({
  channels = [],
  activeChannel = null,
  onSelectChannel,
  friends = [],
  pendingIncomingCount = 0,
  unreadDMs = {},
  activeDMUser = null,
  onSelectDM,
  onOpenAddFriend,
  activeVoice = null,
  isVoiceConnecting = false,
  onJoinVoice,
  user = null,
  currentUsername = "",
  onlineUsers = {},
  userStatus = "online",
  isCollapsed = false,
  onToggleCollapse,
  onOpenSearch,
  onOpenProfileMenu,
  isMobileDrawer = false,
  onCloseDrawer,
}) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlay,
    nextTrack,
    radioMetadata,
  } = useMusicPlayer();

  const [isMusicPopoverOpen, setIsMusicPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const musicPillRef = useRef(null);

  const textChannels = channels.filter((c) => c.type === "text" || !c.type);
  const voiceRooms = [
    {
      id: "general-voice",
      name: "General Voice",
      type: "mesh",
      bitrate: "HD WebRTC Mesh",
    },
  ];

  const username =
    currentUsername ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Operator";
  const userInitials = username.slice(0, 2).toUpperCase();

  const updatePopoverPosition = useCallback(() => {
    if (musicPillRef.current) {
      const rect = musicPillRef.current.getBoundingClientRect();
      setPopoverPosition({
        left: rect.right + 12,
        bottom: Math.max(16, window.innerHeight - rect.bottom),
      });
    }
  }, []);

  const handleOpenMusicPopover = (e) => {
    e.stopPropagation();
    updatePopoverPosition();
    setIsMusicPopoverOpen((prev) => !prev);
  };

  useEffect(() => {
    if (isMusicPopoverOpen) {
      updatePopoverPosition();
      window.addEventListener("resize", updatePopoverPosition);
      return () => window.removeEventListener("resize", updatePopoverPosition);
    }
  }, [isMusicPopoverOpen, updatePopoverPosition]);

  const displayTrackName = currentTrack?.isRadio && radioMetadata?.name
    ? radioMetadata.name
    : currentTrack?.name || "No Track Loaded";

  const displaySubtitle = isLoading
    ? "Buffering..."
    : !isPlaying
    ? "Paused"
    : currentTrack?.isRadio && radioMetadata?.artist
    ? `${radioMetadata.artist}`
    : currentTrack?.artist || "Streaming";

  return (
    <>
      <aside
        className={`sidebar-rail flex flex-col gap-3 h-full shrink-0 bg-[var(--bg-sidebar)] select-none overflow-hidden p-3 ${
          isMobileDrawer ? "w-full" : isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* App Header / Workspace Island */}
        <div
          className={`h-11 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] flex items-center shadow-md shadow-black/30 shrink-0 transition-colors select-none ${
            !isMobileDrawer && isCollapsed ? "w-10 justify-center p-0" : "w-full justify-between pr-2.5"
          }`}
        >
          <button
            onClick={isMobileDrawer ? undefined : onToggleCollapse}
            className={`flex items-center min-w-0 ${isMobileDrawer ? "cursor-default" : "group cursor-pointer"} text-left h-full flex-1`}
            title={!isMobileDrawer ? (isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)") : undefined}
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <AightoLogo className="w-5 h-5 group-hover:scale-105 transition-transform shrink-0" />
            </div>
            {(isMobileDrawer || !isCollapsed) && (
              <div className="overflow-hidden whitespace-nowrap ml-2">
                <h1 className="text-xs font-bold tracking-tight text-zinc-100 truncate group-hover:text-white transition-colors">
                  Aighto
                </h1>
              </div>
            )}
          </button>

          {(isMobileDrawer || !isCollapsed) && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  onOpenSearch();
                  if (isMobileDrawer) onCloseDrawer?.();
                }}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                title="Search Channels (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {isMobileDrawer && (
                <button
                  onClick={onCloseDrawer}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                  title="Close Navigation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Main Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 custom-scrollbar touch-momentum">
          {/* Collapsed quick search button */}
          {!isMobileDrawer && isCollapsed && (
            <div className="flex mb-1 w-full justify-center">
              <button
                onClick={onOpenSearch}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#131318] hover:bg-[#181820] border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white shadow-sm cursor-pointer transition-colors"
                title="Quick Search (Ctrl+K)"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Direct Messages Section */}
          <div>
            {!isCollapsed ? (
              <div className="px-2 mb-1.5 flex items-center justify-between text-[10px] font-medium tracking-wider text-zinc-400 uppercase font-mono">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <MessageSquare className="w-3 h-3 text-zinc-400" /> Direct Messages
                </span>
                <div className="flex items-center gap-1.5">
                  {friends.length > 0 && <span className="text-zinc-500">{friends.length}</span>}
                  <button
                    onClick={onOpenAddFriend}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer relative"
                    title="Add Friend / Requests"
                  >
                    <UserPlus className="w-3 h-3" />
                    {pendingIncomingCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--accent-color)] ring-2 ring-[var(--bg-sidebar)]" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex mb-1 w-full justify-center">
                <button
                  onClick={onOpenAddFriend}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white shadow-sm cursor-pointer relative transition-colors"
                  title="Add Friend / Requests"
                >
                  <UserPlus className="w-4 h-4" />
                  {pendingIncomingCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent-color)] ring-2 ring-[var(--bg-sidebar)]" />
                  )}
                </button>
              </div>
            )}

            <div className="space-y-1">
              {friends.length === 0 ? (
                !isCollapsed && (
                  <div className="px-2.5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[10px] font-mono text-zinc-500">
                      No friends yet.
                    </p>
                    <button
                      onClick={() => {
                        onOpenAddFriend();
                        if (isMobileDrawer) onCloseDrawer?.();
                      }}
                      className="text-[10px] font-mono text-[var(--accent-color)] hover:opacity-80 underline mt-0.5 cursor-pointer block w-full"
                    >
                      + Add Friend
                    </button>
                  </div>
                )
              ) : (
                friends.map((u) => {
                  const isCurrent = activeDMUser?.id === u.id;
                  const isUnread = unreadDMs[u.id] && !isCurrent;
                  const name = u.username || u.id.slice(0, 8);
                  const initials = name.slice(0, 2).toUpperCase();
                  const friendStatus = onlineUsers[u.id] || "offline"; // "online" | "away" | "offline"

                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        if (onSelectDM) onSelectDM(u);
                        if (isMobileDrawer) onCloseDrawer?.();
                      }}
                      className={`w-full flex items-center rounded-xl transition-colors duration-150 cursor-pointer overflow-hidden h-10 ${
                        !isMobileDrawer && isCollapsed ? "justify-center p-0" : "justify-between pr-2 text-xs"
                      } ${
                        isCurrent
                          ? "bg-[var(--accent-muted)] text-white font-medium border border-[var(--accent-border)] shadow-sm"
                          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
                      }`}
                      title={!isMobileDrawer && isCollapsed ? `@${name} (${friendStatus})` : undefined}
                    >
                      <div className="flex items-center min-w-0">
                        {/* Exact 40px x 40px Icon Anchor */}
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-[9px] font-mono font-bold text-zinc-200 shrink-0 relative">
                            {initials}
                            {/* Live Presence Dot on Avatar */}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[var(--bg-sidebar)] ${
                                friendStatus === "online"
                                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                                    : friendStatus === "away"
                                    ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                                    : "bg-zinc-600"
                              }`}
                              title={`Status: ${friendStatus}`}
                            />
                            {isUnread && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent-color)] ring-2 ring-[var(--bg-sidebar)]" />
                            )}
                          </div>
                        </div>
                        {(isMobileDrawer || !isCollapsed) && (
                          <div className={`ml-2 text-left overflow-hidden whitespace-nowrap ${isMobileDrawer ? "max-w-[180px]" : "max-w-[120px]"}`}>
                            <span className={`truncate block ${isUnread ? "font-bold text-[var(--accent-color)]" : ""}`}>
                              @{name}
                            </span>
                          </div>
                        )}
                      </div>
                      {(isMobileDrawer || !isCollapsed) && (
                        <div className="ml-auto pr-1 shrink-0">
                          {isUnread ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] shadow-[0_0_6px_rgba(99,102,241,0.8)] block" />
                          ) : (
                            <span
                              className={`w-1.5 h-1.5 rounded-full block ${
                                friendStatus === "online"
                                  ? "bg-emerald-400"
                                  : friendStatus === "away"
                                  ? "bg-amber-400"
                                  : "bg-zinc-600"
                              }`}
                              title={friendStatus}
                            />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Text Feeds Section */}
          <div>
            {(isMobileDrawer || !isCollapsed) && (
              <div className="px-2 mb-1.5 flex items-center justify-between text-[10px] font-medium tracking-wider text-zinc-400 uppercase font-mono">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <Compass className="w-3 h-3 text-zinc-400" /> Text Feeds
                </span>
                <span>{textChannels.length}</span>
              </div>
            )}

            <div className="space-y-1">
              {textChannels.map((channel) => {
                const isCurrent = !activeDMUser && activeChannel?.id === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      onSelectChannel(channel);
                      if (isMobileDrawer) onCloseDrawer?.();
                    }}
                    className={`w-full flex items-center rounded-xl transition-colors duration-150 cursor-pointer overflow-hidden h-10 ${
                      !isMobileDrawer && isCollapsed ? "justify-center p-0" : "justify-between pr-2 text-xs"
                    } ${
                      isCurrent
                        ? "bg-[var(--accent-muted)] text-white font-medium border border-[var(--accent-border)] shadow-sm"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
                    }`}
                    title={!isMobileDrawer && isCollapsed ? `#${channel.name}` : undefined}
                  >
                    <div className="flex items-center min-w-0">
                      {/* Exact 40px x 40px Icon Anchor */}
                      <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                        <Hash
                          className={`w-4 h-4 ${
                            isCurrent ? "text-[var(--accent-color)]" : "text-zinc-500"
                          }`}
                        />
                      </div>
                      {(isMobileDrawer || !isCollapsed) && (
                        <div className={`ml-2 text-left overflow-hidden whitespace-nowrap ${isMobileDrawer ? "max-w-[180px]" : "max-w-[130px]"}`}>
                          <span className="truncate block font-medium">{channel.name}</span>
                        </div>
                      )}
                    </div>
                    {(isMobileDrawer || !isCollapsed) && isCurrent && (
                      <div className="ml-auto pr-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] block" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Mesh Stages Section */}
          <div>
            {(isMobileDrawer || !isCollapsed) && (
              <div className="px-2 mb-1.5 flex items-center justify-between text-[10px] font-medium tracking-wider text-zinc-400 uppercase font-mono">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <Radio className="w-3 h-3 text-zinc-400" /> Audio Meshes
                </span>
                <span className="text-[9px] text-[var(--accent-color)] font-mono">HD</span>
              </div>
            )}

            <div className="space-y-1">
              {voiceRooms.map((room) => {
                const isCurrent = activeVoice === room.id;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      onJoinVoice(room.id);
                      if (isMobileDrawer) onCloseDrawer?.();
                    }}
                    disabled={isVoiceConnecting}
                    className={`w-full flex items-center rounded-xl transition-colors duration-150 cursor-pointer relative overflow-hidden h-10 ${
                      !isMobileDrawer && isCollapsed ? "justify-center p-0" : "justify-between pr-2 text-xs"
                    } ${
                      isCurrent
                        ? "bg-[var(--accent-muted)] text-white font-medium border border-[var(--accent-border)] shadow-sm"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
                    }`}
                    title={!isMobileDrawer && isCollapsed ? room.name : undefined}
                  >
                    <div className="flex items-center min-w-0">
                      {/* Exact 40px x 40px Icon Anchor */}
                      <div className="w-10 h-10 shrink-0 flex items-center justify-center relative">
                        <Radio
                          className={`w-4 h-4 ${
                            isCurrent ? "text-emerald-400" : "text-zinc-500"
                          }`}
                        />
                        {!isMobileDrawer && isCollapsed && isCurrent && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-[#0d0d11]" />
                        )}
                      </div>
                      {(isMobileDrawer || !isCollapsed) && (
                        <div className={`ml-2 text-left overflow-hidden whitespace-nowrap ${isMobileDrawer ? "max-w-[180px]" : "max-w-[130px]"}`}>
                          <span className="truncate block font-medium">{room.name}</span>
                          <span className="text-[9px] text-zinc-500 block font-mono">
                            {room.bitrate}
                          </span>
                        </div>
                      )}
                    </div>
                    {(isMobileDrawer || !isCollapsed) && isCurrent && (
                      <div className="ml-auto pr-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Integrated Background Music Player Pill */}
        <div
          ref={musicPillRef}
          data-music-trigger="true"
          className={`h-11 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] flex items-center shadow-md shadow-black/30 shrink-0 transition-colors select-none ${
            !isMobileDrawer && isCollapsed ? "w-10 justify-center p-0" : "w-full justify-between pr-2.5"
          }`}
        >
          {/* Main Music Clickable Area */}
          <button
            onClick={handleOpenMusicPopover}
            data-music-trigger="true"
            className="flex items-center min-w-0 flex-1 text-left cursor-pointer group hover:opacity-90 transition-opacity h-full"
            title={`Music: ${displayTrackName} - ${displaySubtitle} (${isPlaying ? "Playing" : "Paused"})`}
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0 text-[var(--accent-color)] relative">
              <Music className="w-4 h-4" />
              {!isMobileDrawer && isCollapsed && isPlaying && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent-color)] ring-2 ring-[#0d0d11]" />
              )}
            </div>

            {(isMobileDrawer || !isCollapsed) && (
              <div className={`overflow-hidden whitespace-nowrap ${isMobileDrawer ? "max-w-[150px]" : "max-w-[105px]"} ml-2`}>
                <div
                  className={displayTrackName.length > 12 ? "animate-marquee-oscillate inline-block" : "truncate"}
                  style={displayTrackName.length > 12 ? { "--marquee-dist": `-${Math.min(65, (displayTrackName.length - 9) * 6)}%`, "--marquee-duration": "7s" } : undefined}
                >
                  <p className="text-[11px] font-medium text-zinc-100 group-hover:text-white leading-tight transition-colors">
                    {displayTrackName}
                  </p>
                </div>
                <div
                  className={displaySubtitle.length > 14 ? "animate-marquee-oscillate inline-block" : "truncate"}
                  style={displaySubtitle.length > 14 ? { "--marquee-dist": `-${Math.min(65, (displaySubtitle.length - 11) * 6)}%`, "--marquee-duration": "9s" } : undefined}
                >
                  <p className="text-[9px] font-mono text-zinc-400 leading-tight">
                    {displaySubtitle}
                  </p>
                </div>
              </div>
            )}
          </button>

          {/* Quick Transport Buttons */}
          {(isMobileDrawer || !isCollapsed) && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-3 h-3 text-[var(--accent-color)]" /> : <Play className="w-3 h-3 text-zinc-400" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextTrack();
                }}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* User Bento Bottom Launcher */}
        <div
          onClick={() => {
            onOpenProfileMenu();
            if (isMobileDrawer) onCloseDrawer?.();
          }}
          data-profile-trigger="true"
          className={`h-11 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)] flex items-center shadow-md shadow-black/30 cursor-pointer group select-none shrink-0 transition-colors ${
            !isMobileDrawer && isCollapsed ? "w-10 justify-center p-0" : "w-full justify-between pr-2.5"
          }`}
          title={`Profile & Settings (${userStatus === "away" ? "Away" : "Online"})`}
        >
          <div className="flex items-center min-w-0 h-full flex-1">
            <div className="w-10 h-10 flex items-center justify-center text-xs font-mono font-bold text-zinc-300 group-hover:text-white shrink-0 relative transition-colors">
              {userInitials}
              <span
                className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-[#0d0d11] ${
                  userStatus === "away"
                    ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                    : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                }`}
              />
            </div>
            {(isMobileDrawer || !isCollapsed) && (
              <div className={`overflow-hidden whitespace-nowrap ${isMobileDrawer ? "max-w-[180px]" : "max-w-[125px]"} ml-2`}>
                <p className="text-xs font-semibold text-zinc-100 group-hover:text-white truncate leading-none mb-0.5 transition-colors">
                  {username}
                </p>
                <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                  <CircleDot
                    className={`w-2 h-2 fill-current ${
                      userStatus === "away" ? "text-amber-400" : "text-emerald-400"
                    }`}
                  />
                  {userStatus === "away" ? "away (idle)" : "online"}
                </span>
              </div>
            )}
          </div>
          {(isMobileDrawer || !isCollapsed) && (
            <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0 pr-0.5">
              <Settings className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </aside>

      {/* Floating Music Player Popover */}
      <MusicPlayerPopover
        isOpen={isMusicPopoverOpen}
        onClose={() => setIsMusicPopoverOpen(false)}
        anchorPosition={popoverPosition}
      />
    </>
  );
}