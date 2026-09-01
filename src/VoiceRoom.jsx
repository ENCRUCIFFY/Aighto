import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { generateToken, livekitUrl } from "./livekit";
import BentoAudioDock, { BentoAudioBars } from "./components/BentoAudioDock";
import ParticipantContextMenu from "./components/ParticipantContextMenu";
import { useParticipantAudio } from "./hooks/useParticipantAudio";
import {
  Radio,
  MonitorUp,
  Users,
  Maximize,
  Minimize,
  Volume2,
  PhoneOff,
} from "lucide-react";

export function VideoLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlyRenderVisible: true }
  );

  const { localParticipant } = useLocalParticipant();

  const [focusedParticipantIdentity, setFocusedParticipantIdentity] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    participant: null,
    position: { x: 0, y: 0 },
    isLocal: false,
  });

  const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const otherTracks = tracks.filter((t) => t.source !== Track.Source.ScreenShare);

  const handleTileContextMenu = (e, participant) => {
    e.preventDefault();
    e.stopPropagation();
    const isLocal = participant.identity === localParticipant?.identity;
    setContextMenu({
      isOpen: true,
      participant,
      position: { x: e.clientX, y: e.clientY },
      isLocal,
    });
  };

  const handleTileClick = (participantIdentity) => {
    // When a screen is being shared, disallow spotlighting a participant
    if (screenShareTrack) return;
    setFocusedParticipantIdentity((prev) =>
      prev === participantIdentity ? null : participantIdentity
    );
  };

  // If a screen is being shared, spotlight is automatically suppressed during render
  const effectiveFocusedIdentity = screenShareTrack ? null : focusedParticipantIdentity;

  // Find focused track if any
  const focusedTrack = effectiveFocusedIdentity
    ? otherTracks.find((t) => t.participant.identity === effectiveFocusedIdentity)
    : null;

  const unfocusedTracks = focusedTrack
    ? otherTracks.filter((t) => t.participant.identity !== effectiveFocusedIdentity)
    : otherTracks;

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col md:flex-row bg-[var(--bg-main)]">
      {/* Main Content Area */}
      <div className={`flex-1 p-4 md:p-6 overflow-hidden flex flex-col ${screenShareTrack || focusedTrack ? "md:w-3/4" : "w-full"}`}>
        {screenShareTrack ? (
          <div className="relative rounded-2xl overflow-hidden aspect-video border border-[var(--border-card)] bg-black h-full max-h-[85vh] mx-auto">
            <VideoTrack
              trackRef={screenShareTrack}
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 border border-white/10">
              <MonitorUp className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              <span className="text-[11px] font-mono font-medium text-white/90 tracking-wider uppercase">
                {screenShareTrack.participant.identity}'S PROJECTION
              </span>
            </div>
          </div>
        ) : focusedTrack ? (
          /* Focused / Spotlighted Tile Mode */
          <div className="h-full w-full flex flex-col gap-2 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-1 shrink-0">
              <span className="text-xs font-mono text-zinc-300 flex items-center gap-2">
                <Maximize className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                Spotlight: <span className="text-white font-bold">{focusedTrack.participant.identity}</span>
              </span>
              <button
                onClick={() => setFocusedParticipantIdentity(null)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-zinc-300 transition cursor-pointer flex items-center gap-1.5"
              >
                <Minimize className="w-3 h-3" />
                Reset Grid
              </button>
            </div>
            
            <div className="flex-1 w-full min-h-0 flex items-center justify-center p-1">
              <div className="w-full h-full max-h-full aspect-video rounded-2xl overflow-hidden">
                <ParticipantTile
                  track={focusedTrack}
                  isFocused={true}
                  onClick={() => handleTileClick(focusedTrack.participant.identity)}
                  onContextMenu={(e) => handleTileContextMenu(e, focusedTrack.participant)}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        ) : otherTracks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-zinc-500">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-color)]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200 font-mono">Stage Connected</p>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                Waiting for others to step up to the mesh
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max content-start overflow-y-auto">
            {otherTracks.map((track) => (
              <ParticipantTile
                key={`${track.participant.identity}_${track.source}`}
                track={track}
                isFocused={false}
                onClick={() => handleTileClick(track.participant.identity)}
                onContextMenu={(e) => handleTileContextMenu(e, track.participant)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Side strip when screen sharing or when a tile is focused */}
      {(screenShareTrack || focusedTrack) && (
        <div className="w-full md:w-64 p-4 border-l border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-y-auto flex flex-col gap-4 shrink-0">
          <p className="text-[10px] font-mono font-medium tracking-wider text-zinc-400 uppercase px-1">
            {focusedTrack ? "Other Participants" : "Mesh Participants"}
          </p>
          <div className="flex flex-col gap-3">
            {unfocusedTracks.map((track) => (
              <SideStripTile
                key={`${track.participant.identity}_${track.source}`}
                track={track}
                canSpotlight={!screenShareTrack}
                onClick={() => handleTileClick(track.participant.identity)}
                onContextMenu={(e) => handleTileContextMenu(e, track.participant)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Floating Right-Click Context Menu */}
      {contextMenu.isOpen && (
        <ParticipantContextMenu
          participant={contextMenu.participant}
          position={contextMenu.position}
          isLocal={contextMenu.isLocal}
          onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}

export function ParticipantTile({
  track,
  isFocused = false,
  canSpotlight = true,
  onClick,
  onContextMenu,
  className = "aspect-video",
}) {
  const { volume, isSpeaking } = useParticipantAudio(track.participant);

  // Check if camera is actively publishing unmuted video
  const isVideoActive = Boolean(
    track.publication?.track &&
    !track.publication?.isMuted &&
    !track.isMuted &&
    track.participant?.isCameraEnabled !== false
  );

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`relative rounded-2xl overflow-hidden border transition-all duration-100 cursor-pointer ${className} ${
        isSpeaking
          ? "border-emerald-400 ring-2 ring-emerald-400/40"
          : isFocused
          ? "border-[var(--accent-color)] ring-2 ring-[var(--accent-border)]"
          : "border-[var(--border-subtle)] hover:border-[var(--border-card)]"
      } bg-[var(--bg-card)]`}
      title={canSpotlight ? "Left-click to spotlight • Right-click for audio menu" : "Right-click for audio menu"}
    >
      {isVideoActive ? (
        <VideoTrack
          trackRef={track}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-3 relative">
          <div
            className={`w-16 h-16 rounded-2xl bg-[var(--accent-muted)] border transition-all duration-100 flex items-center justify-center text-[var(--accent-color)] font-mono text-xl font-bold tracking-wider ${
              isSpeaking
                ? "border-emerald-400 ring-2 ring-emerald-400/50"
                : "border-[var(--accent-border)]"
            }`}
          >
            {track.participant.identity.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-zinc-200 tracking-tight font-mono">
            {track.participant.name || track.participant.identity}
          </span>
        </div>
      )}

      {/* Overlay Identity & Dynamic Volume Waveform Pill */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2.5 px-2.5 py-1 rounded-xl bg-black/85 border border-white/10 z-10">
        <BentoAudioBars isSpeaking={isSpeaking} volume={volume} barCount={4} />
        <span className="text-[10px] font-mono font-medium text-white/90 tracking-wider uppercase truncate max-w-[120px]">
          {track.participant.identity}
        </span>
      </div>

      {/* Right-Click Hint on hover */}
      <div className="absolute top-3 right-3 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity z-10">
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-black/85 border border-white/10 text-zinc-300 flex items-center gap-1">
          <Volume2 className="w-2.5 h-2.5 text-[var(--accent-color)]" />
          Right-Click Audio
        </span>
      </div>
    </div>
  );
}

export function SideStripTile({ track, canSpotlight = true, onClick, onContextMenu }) {
  const { volume, isSpeaking } = useParticipantAudio(track.participant);

  const isVideoActive = Boolean(
    track.publication?.track &&
    !track.publication?.isMuted &&
    !track.isMuted &&
    track.participant?.isCameraEnabled !== false
  );

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`relative rounded-xl overflow-hidden aspect-video border transition-all duration-100 cursor-pointer ${
        isSpeaking
          ? "border-emerald-400 ring-1 ring-emerald-400"
          : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-card)]"
      }`}
      title={canSpotlight ? "Left-click to spotlight • Right-click for audio controls" : "Right-click for audio controls"}
    >
      {isVideoActive ? (
        <VideoTrack trackRef={track} className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full bg-[var(--bg-card)]">
          <div
            className={`w-8 h-8 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-[10px] font-bold text-[var(--accent-color)] transition-all duration-100 ${
              isSpeaking ? "ring-2 ring-emerald-400" : ""
            }`}
          >
            {track.participant.identity.slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-1.5 py-0.5 rounded-lg bg-black/85">
        <span className="text-[9px] font-mono text-white/90 truncate max-w-[60%]">
          {track.participant.identity}
        </span>
        <BentoAudioBars isSpeaking={isSpeaking} volume={volume} barCount={3} />
      </div>
    </div>
  );
}

/**
 * Inner stage presentation when rendered inside a LiveKitRoom context
 */
export function VoiceRoomStage({
  roomName = "General Voice",
  onDisconnect,
  onToggleStageView,
}) {
  const displayTitle = roomName || "General Voice";

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] text-white relative overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)] z-10 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            {displayTitle}
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)] font-mono text-[var(--accent-color)] font-bold">
              VOICE STAGE
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-mono text-xs font-semibold transition shadow-md shadow-rose-950/60 cursor-pointer active:scale-95"
              title="Leave Room"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Video Mesh Grid */}
      <VideoLayout />

      {/* Bottom Bento Control Surface */}
      <div className="p-4 bg-[var(--bg-sidebar)] border-t border-[var(--border-subtle)] shrink-0">
        <BentoAudioDock
          roomName={roomName}
          onDisconnect={onDisconnect}
          isStageView={true}
          onToggleStageView={onToggleStageView}
          floating={false}
        />
      </div>
    </div>
  );
}

/**
 * Standalone VoiceRoom wrapper (manages token generation & LiveKitRoom)
 */
export default function VoiceRoom({
  roomName = "general-voice",
  username,
  onDisconnect,
  onToggleStageView,
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchToken() {
      try {
        const identity = username || `User_${Math.floor(Math.random() * 10000)}`;
        const jwt = await generateToken(roomName, identity);
        if (mounted) setToken(jwt);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to connect to voice room");
      }
    }

    fetchToken();
    return () => {
      mounted = false;
    };
  }, [roomName, username]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/40 text-rose-400 max-w-sm">
          <p className="font-semibold text-sm mb-1">Signal Loss</p>
          <p className="text-xs text-zinc-400 mb-4">{error}</p>
          <button
            onClick={onDisconnect}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-zinc-200 rounded-xl text-xs font-mono border border-white/10 transition cursor-pointer"
          >
            Return to Stream
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center">
          <Radio className="w-5 h-5 text-[var(--accent-color)]" />
        </div>
        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
          Connecting Audio Mesh...
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={`${roomName}-${token}`}
      video={false}
      audio={true}
      token={token}
      serverUrl={livekitUrl}
      onDisconnected={onDisconnect}
      className="flex flex-col h-full bg-[var(--bg-main)] text-white relative overflow-hidden"
    >
      <VoiceRoomStage
        roomName={roomName}
        onDisconnect={onDisconnect}
        onToggleStageView={onToggleStageView}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}