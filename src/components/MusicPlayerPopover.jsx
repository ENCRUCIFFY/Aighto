import { useState, useRef, useEffect } from "react";
import { useMusicPlayer } from "../MusicPlayerContext";
import {
  Radio,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ShieldAlert,
  Sliders,
  X,
  ChevronRight,
  ChevronLeft,
  Disc3,
  RefreshCw,
  FolderPlus,
  Trash2,
  HardDrive,
  Maximize2,
  Shuffle,
  Repeat,
  Repeat1,
} from "lucide-react";

function formatTime(seconds) {
  if (isNaN(seconds) || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function MusicPlayerPopover({ isOpen, onClose, anchorPosition }) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    playbackError,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    smartDucking,
    setSmartDucking,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    officialRadio,
    playlistTracks,
    isLoadingPlaylist,
    refreshPlaylist,
    userTracks,
    isImportingUserTracks,
    importUserFiles,
    removeUserTrack,
    radioMetadata,
    setIsFullscreenStage,
    currentTime,
    duration,
    seekTo,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeatMode,
    cycleEqPreset,
    currentEqPresetObj,
  } = useMusicPlayer();

  const [activeTab, setActiveTab] = useState("presets"); // "presets" | "user"
  const [presetView, setPresetView] = useState("overview"); // "overview" | "playlist"
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const popoverRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      // If clicking inside the popover or clicking on the music trigger button, ignore
      if (e.target?.closest && e.target.closest('[data-music-trigger="true"]')) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      importUserFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      importUserFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const style = anchorPosition
    ? {
        left: typeof anchorPosition.left === "number" ? `${anchorPosition.left}px` : (anchorPosition.x ? `${anchorPosition.x}px` : "76px"),
        bottom: typeof anchorPosition.bottom === "number" ? `${anchorPosition.bottom}px` : (anchorPosition.y ? `${anchorPosition.y}px` : "16px"),
        top: typeof anchorPosition.top === "number" ? `${anchorPosition.top}px` : anchorPosition.top,
      }
    : {
        left: "76px",
        bottom: "16px",
      };

  return (
    <div
      ref={popoverRef}
      style={style}
      className="fixed z-50 w-84 rounded-2xl bg-[var(--bg-popover)] border border-[var(--border-card)] p-4 shadow-2xl shadow-black/90 text-zinc-100 select-none text-xs animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-color)]">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <div className="max-w-[180px] overflow-hidden whitespace-nowrap">
            {(() => {
              const titleText = currentTrack?.isRadio && radioMetadata?.name
                ? radioMetadata.name
                : currentTrack?.name || "Background Audio";
              const artistText = isLoading
                ? "Buffering audio..."
                : !isPlaying
                ? "Paused"
                : currentTrack?.isRadio
                ? `Live • ${radioMetadata?.artist || "CHILLSYNTH FM"}`
                : currentTrack?.artist || "Playing";

              return (
                <>
                  <div
                    className={titleText.length > 20 ? "animate-marquee-oscillate inline-block" : "truncate"}
                    style={titleText.length > 20 ? { "--marquee-dist": `-${Math.min(65, (titleText.length - 18) * 4)}%`, "--marquee-duration": "8s" } : undefined}
                  >
                    <h3 className="text-xs font-semibold text-white tracking-wide">
                      {titleText}
                    </h3>
                  </div>
                  <div
                    className={artistText.length > 24 ? "animate-marquee-oscillate inline-block" : "truncate"}
                    style={artistText.length > 24 ? { "--marquee-dist": `-${Math.min(65, (artistText.length - 20) * 4)}%`, "--marquee-duration": "10s" } : undefined}
                  >
                    <p className="text-[10px] text-zinc-400">
                      {artistText}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsFullscreenStage(true);
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-white/10 text-[var(--accent-color)] hover:text-white transition-colors cursor-pointer"
            title="Open 2000s Retrowave Fullscreen Stage"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-sidebar)] rounded-xl border border-[var(--border-subtle)] mb-3">
        <button
          onClick={() => {
            setActiveTab("presets");
            setPresetView("overview");
          }}
          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer text-center ${
            activeTab === "presets"
              ? "bg-[var(--accent-muted)] text-[var(--accent-color)] border border-[var(--accent-border)] shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          App Presets
        </button>
        <button
          onClick={() => setActiveTab("user")}
          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeTab === "user"
              ? "bg-[var(--accent-muted)] text-[var(--accent-color)] border border-[var(--accent-border)] shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <span>My Music</span>
          {userTracks.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-muted)] border border-[var(--accent-border)] text-[var(--accent-color)] font-bold">
              {userTracks.length}
            </span>
          )}
        </button>
      </div>

      {/* Playback Error Warning */}
      {playbackError && (
        <div className="mb-3 p-2 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[10px] flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{playbackError}</span>
        </div>
      )}

      {/* Tab 1: App Presets (Radio + Playlist Drilldown) */}
      {activeTab === "presets" && (
        <div className="mb-3">
          {presetView === "overview" ? (
            <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {/* Radio Channel Section */}
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 px-0.5">
                  24/7 Live Stream
                </p>
                {officialRadio.map((station) => {
                  const isSelected = !currentTrack?.isUserLocal && currentTrack?.id === station.id;
                  return (
                    <button
                      key={station.id}
                      onClick={() => playTrack(station)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                        isSelected
                          ? "bg-[var(--accent-muted)] border border-[var(--accent-border)] text-white shadow-sm"
                          : "bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[var(--accent-color)] shrink-0">
                          {isSelected && isPlaying ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                          ) : (
                            <Radio className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs truncate leading-tight text-white">
                              {station.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-muted)] border border-[var(--accent-border)] text-[var(--accent-color)] font-bold">
                              LIVE
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-400 block truncate max-w-[150px]">
                            {isSelected && isPlaying && radioMetadata?.name
                              ? `${radioMetadata.artist} - ${radioMetadata.name}`
                              : station.genre || station.artist}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 pl-2">
                        {isSelected && isPlaying ? (
                          <span className="text-[10px] text-emerald-400 font-semibold">PLAYING</span>
                        ) : (
                          <Play className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Curated Playlist Entry Button */}
              <div>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 px-0.5">
                  Curated Audio Playlist
                </p>
                <button
                  onClick={() => setPresetView("playlist")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-zinc-200 transition-colors cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[var(--accent-color)] shrink-0">
                      <Disc3 className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate text-left">
                      <span className="font-semibold text-xs truncate leading-tight text-white group-hover:text-[var(--accent-color)] transition-colors block">
                        Official Music Playlist
                      </span>
                      <span className="text-[9px] text-zinc-400 block">
                        {playlistTracks.length} {playlistTracks.length === 1 ? "track" : "tracks"} available
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-400 group-hover:text-[var(--accent-color)] shrink-0 pl-2 transition-colors">
                    <span className="text-[10px]">Open</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Subview: Playlist Drilldown Track List */
            <div className="space-y-2">
              {/* Back to Presets Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <button
                  onClick={() => setPresetView("overview")}
                  className="flex items-center gap-1 text-[11px] text-[var(--accent-color)] hover:opacity-80 font-semibold transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Presets</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-400">
                    {playlistTracks.length} tracks
                  </span>
                  <button
                    onClick={() => refreshPlaylist()}
                    disabled={isLoadingPlaylist}
                    className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Refresh Tracks"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingPlaylist ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Tracks List */}
              <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {isLoadingPlaylist ? (
                  <p className="text-[10px] text-zinc-500 text-center py-4">
                    Loading playlist...
                  </p>
                ) : playlistTracks.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
                    <p className="text-[11px] text-zinc-200 font-semibold">
                      No tracks uploaded yet
                    </p>
                    <p className="text-[9px] text-zinc-400 leading-relaxed">
                      Upload .mp3 files into the Supabase &lsquo;music&rsquo; storage bucket.
                    </p>
                  </div>
                ) : (
                  playlistTracks.map((track, idx) => {
                    const isSelected = !currentTrack?.isUserLocal && currentTrack?.id === track.id;
                    return (
                      <button
                        key={track.id || idx}
                        onClick={() => playTrack(track)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer text-left ${
                          isSelected
                            ? "bg-[var(--accent-muted)] border border-[var(--accent-border)] text-white shadow-sm"
                            : "bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[var(--accent-color)] shrink-0 text-[10px]">
                            {isSelected && isPlaying ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-xs truncate leading-tight text-white">
                              {track.name}
                            </p>
                            <span className="text-[9px] text-zinc-400 block">
                              {track.artist || "Aighto Curated"}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 pl-2">
                          {isSelected && isPlaying ? (
                            <span className="text-[9px] text-emerald-400 font-semibold">PLAYING</span>
                          ) : (
                            <Play className="w-3 h-3 text-zinc-400" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Personal Local Music (IndexedDB Storage) */}
      {activeTab === "user" && (
        <div className="space-y-2 mb-3">
          {/* File Upload Zone */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".mp3,.flac,.wav,.m4a,.ogg,.aac,.webm"
            multiple
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 rounded-xl border border-dashed transition-colors flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer select-none ${
              isDraggingFile
                ? "bg-[var(--accent-muted)] border-[var(--accent-color)] text-[var(--accent-color)]"
                : "bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border-card)] text-zinc-300 hover:border-[var(--accent-border)]"
            }`}
          >
            <FolderPlus className="w-5 h-5 text-[var(--accent-color)]" />
            <div>
              <p className="text-[11px] font-semibold text-white">
                {isImportingUserTracks ? "Importing files..." : "+ Import Audio from PC"}
              </p>
              <p className="text-[9px] text-zinc-400 mt-0.5">
                Drop .mp3, .flac, .wav files (Saved permanently)
              </p>
            </div>
          </div>

          {/* User Tracks List */}
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            {userTracks.length === 0 ? (
              <div className="p-3 text-center text-zinc-500 text-[10px] space-y-1">
                <HardDrive className="w-4 h-4 mx-auto text-zinc-500" />
                <p>No local songs saved yet.</p>
                <p className="text-[9px] text-zinc-500">
                  Imported tracks are stored locally on your device.
                </p>
              </div>
            ) : (
              userTracks.map((track, idx) => {
                const isSelected = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors text-left group ${
                      isSelected
                        ? "bg-[var(--accent-muted)] border border-[var(--accent-border)] text-white shadow-sm"
                        : "bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-subtle)] text-zinc-300"
                    }`}
                  >
                    <button
                      onClick={() => playTrack(track)}
                      className="flex items-center gap-2 truncate flex-1 cursor-pointer text-left"
                    >
                      <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[var(--accent-color)] shrink-0 text-[10px]">
                        {isSelected && isPlaying ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="truncate">
                        <p className="font-semibold text-xs truncate leading-tight text-white">
                          {track.name}
                        </p>
                        <span className="text-[9px] text-zinc-400 block">
                          {track.artist || "My Song"}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <button
                        onClick={() => playTrack(track)}
                        className="p-1 hover:text-white text-zinc-400 cursor-pointer"
                        title={isSelected && isPlaying ? "Playing" : "Play"}
                      >
                        {isSelected && isPlaying ? (
                          <span className="text-[9px] text-emerald-400 font-semibold">PLAYING</span>
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUserTrack(track.id);
                        }}
                        className="p-1 hover:bg-rose-950/60 rounded-md text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete from local vault"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Audio Controls Bar */}
      <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
        
        {/* Timeline Scrubber */}
        {!currentTrack?.isRadio ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 font-medium">
              <span className="text-zinc-200">{formatTime(currentTime)}</span>
              <span className="text-zinc-400">{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="w-full accent-[var(--accent-color)] bg-zinc-800 h-1 rounded-lg cursor-pointer"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between text-[9px] font-mono text-emerald-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE 24/7 BROADCAST
            </span>
            <span className="text-zinc-400">CHILLSYNTH FM</span>
          </div>
        )}

        {/* Playback Transport & Volume Deck */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isShuffle
                  ? "bg-[var(--accent-muted)] border-[var(--accent-border)] text-[var(--accent-color)]"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
              }`}
              title={`Shuffle: ${isShuffle ? "ON" : "OFF"}`}
            >
              <Shuffle className="w-3 h-3" />
            </button>

            <button
              onClick={prevTrack}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-3 h-3" />
            </button>

            <button
              onClick={togglePlay}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold transition-all shadow-md shadow-black/40 cursor-pointer active:scale-95 shrink-0 text-xs"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <button
              onClick={nextTrack}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-3 h-3" />
            </button>

            <button
              onClick={cycleRepeatMode}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer relative ${
                repeatMode !== "off"
                  ? "bg-[var(--accent-muted)] border-[var(--accent-border)] text-[var(--accent-color)]"
                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
              }`}
              title={`Repeat: ${repeatMode.toUpperCase()}`}
            >
              {repeatMode === "one" ? <Repeat1 className="w-3 h-3" /> : <Repeat className="w-3 h-3" />}
              {repeatMode !== "off" && (
                <span className="absolute -top-1 -right-1 text-[7px] font-bold px-0.5 rounded bg-[var(--accent-color)] text-[var(--accent-text)]">
                  {repeatMode === "one" ? "1" : "A"}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
            <button
              onClick={toggleMute}
              className="p-0.5 hover:text-white text-zinc-400 transition-colors cursor-pointer shrink-0"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3 h-3 text-rose-400" />
              ) : (
                <Volume2 className="w-3 h-3 text-[var(--accent-color)]" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-[var(--accent-color)] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
            />
            <span className="text-[9px] text-zinc-400 w-5 text-right shrink-0">
              {isMuted ? 0 : volume}%
            </span>
          </div>
        </div>

        {/* Smart Voice Ducking & Hardware EQ Row */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-zinc-400" />
              <div>
                <p className="text-[10px] font-medium text-zinc-200">Smart Voice Ducking</p>
                <p className="text-[9px] text-zinc-400">Auto-lower volume during calls</p>
              </div>
            </div>
            <button
              onClick={() => setSmartDucking(!smartDucking)}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                smartDucking ? "bg-[var(--accent-color)]" : "bg-zinc-800 border border-white/10"
              }`}
            >
              <span
                className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                  smartDucking ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-[var(--accent-color)]" />
              <div>
                <p className="text-[10px] font-medium text-zinc-200">Hardware Audio EQ</p>
                <p className="text-[9px] text-zinc-400">{currentEqPresetObj.desc}</p>
              </div>
            </div>
            <button
              onClick={cycleEqPreset}
              className="px-2.5 py-1 rounded-lg bg-[var(--accent-muted)] hover:opacity-90 border border-[var(--accent-border)] text-[var(--accent-color)] font-mono text-[10px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              title="Click to cycle EQ presets"
            >
              {currentEqPresetObj.shortName}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
