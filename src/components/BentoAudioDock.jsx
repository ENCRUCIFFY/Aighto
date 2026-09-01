import { useState, useEffect, useRef } from "react";
import {
  useLocalParticipant,
  useConnectionState,
  useSpeakingParticipants,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Activity,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react";
import ParticipantContextMenu from "./ParticipantContextMenu";

/**
 * Dynamic audio waveform equalizer bars that scale with speech volume
 */
export function BentoAudioBars({ isSpeaking, volume = 0, barCount = 4, className = "" }) {
  const baseMultipliers = [0.45, 0.95, 0.65, 1.0, 0.5, 0.8];

  return (
    <div className={`flex items-center gap-[2.5px] h-4 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => {
        const factor = baseMultipliers[i % baseMultipliers.length];
        const barHeight = isSpeaking
          ? volume > 0
            ? Math.max(4, Math.min(16, Math.round(volume * 16 * factor + 3)))
            : Math.max(5, Math.round(14 * factor))
          : 3;

        return (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-all duration-75 ${
              isSpeaking
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                : "bg-zinc-700"
            }`}
            style={{
              height: `${barHeight}px`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Floating Bento Audio Dock Component
 * Matches the Obsidian Pro clean neutral dark aesthetic.
 */
export default function BentoAudioDock({
  roomName = "General Voice",
  onDisconnect,
  isStageView = false,
  onToggleStageView,
  floating = false,
}) {
  const displayTitle = roomName || "General Voice";
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();

  const room = useRoomContext();
  const connectionState = useConnectionState();
  const speakingParticipants = useSpeakingParticipants();
  const allParticipants = useParticipants();

  const [deafened, setDeafened] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedInputId, setSelectedInputId] = useState("");
  const [selectedOutputId, setSelectedOutputId] = useState("");

  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    participant: null,
    position: { x: 0, y: 0 },
    isLocal: false,
  });

  const settingsRef = useRef(null);

  // Manage deafen behavior by muting/unmuting all remote audio elements
  useEffect(() => {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((el) => {
      el.muted = deafened;
    });
  }, [deafened]);

  // Enumerate Audio Devices
  useEffect(() => {
    async function loadDevices() {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const inputs = devices.filter((d) => d.kind === "audioinput");
          const outputs = devices.filter((d) => d.kind === "audiooutput");
          setAudioInputDevices(inputs);
          setAudioOutputDevices(outputs);
          if (inputs.length > 0) setSelectedInputId(inputs[0].deviceId);
          if (outputs.length > 0) setSelectedOutputId(outputs[0].deviceId);
        }
      } catch (err) {
        console.warn("Could not enumerate audio devices:", err);
      }
    }

    loadDevices();
  }, []);

  // Close Settings on outside click
  useEffect(() => {
    if (!showSettings) return;

    const handleOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };

    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [showSettings]);

  const handleDeviceChange = async (kind, deviceId) => {
    try {
      if (kind === "audioinput") {
        setSelectedInputId(deviceId);
        if (room) {
          await room.switchActiveDevice("audioinput", deviceId);
        }
      } else if (kind === "audiooutput") {
        setSelectedOutputId(deviceId);
        if (room && typeof room.switchActiveDevice === "function") {
          await room.switchActiveDevice("audiooutput", deviceId);
        }
      }
    } catch (e) {
      console.warn("Device switch error:", e);
    }
  };

  const isConnected = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting;

  const isLocalSpeaking = speakingParticipants.some(
    (p) => p.identity === localParticipant?.identity
  );
  const totalSpeakers = speakingParticipants.length;

  const primarySpeaker = totalSpeakers > 0 ? speakingParticipants[0] : null;
  const primarySpeakerName = primarySpeaker
    ? primarySpeaker.name || primarySpeaker.identity
    : null;

  const handleSpeakerPillContextMenu = (e, participant) => {
    e.preventDefault();
    if (!participant) return;
    setContextMenu({
      isOpen: true,
      participant,
      position: { x: e.clientX, y: e.clientY },
      isLocal: participant.identity === localParticipant?.identity,
    });
  };

  const dockContainerClasses = floating
    ? "absolute bottom-20 md:bottom-5 left-2 right-2 md:left-auto md:right-5 z-30 select-none animate-in fade-in slide-in-from-bottom-3 duration-200"
    : "w-full select-none";

  return (
    <div className={dockContainerClasses}>
      <div className="relative p-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] flex flex-wrap items-center justify-between gap-3 text-zinc-100 transition-all duration-200 hover:border-[var(--accent-border)] shadow-2xl shadow-black/80">
        
        {/* Left Side: Room Identity & Live Connection Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={onToggleStageView}
            className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] transition cursor-pointer hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-card)] ${
              isStageView ? "ring-1 ring-[var(--accent-border)]" : ""
            }`}
            title={isStageView ? "Collapse to Chat Feed" : "Expand to Full Voice Stage"}
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                    : isConnecting
                    ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                    : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                }`}
              />
            </div>

            <div className="flex flex-col text-left truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-100 truncate tracking-tight">
                  {displayTitle}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-muted)] border border-[var(--accent-border)] font-mono text-[var(--accent-color)] font-medium">
                  {allParticipants.length} online
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 text-[var(--accent-color)] inline" />
                {isConnected ? "HD WebRTC Mesh" : isConnecting ? "Connecting..." : "Offline"}
              </span>
            </div>

            {onToggleStageView && (
              <div className="ml-1 p-1 rounded-lg text-zinc-400 group-hover:text-zinc-200 transition">
                {isStageView ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </div>
            )}
          </div>

          {/* Active Speaker Dynamic Capsule */}
          <div
            onContextMenu={(e) => handleSpeakerPillContextMenu(e, primarySpeaker)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-main)] border border-[var(--border-subtle)] cursor-context-menu"
            title="Right-click speaker for individual volume controls"
          >
            <BentoAudioBars isSpeaking={totalSpeakers > 0} barCount={4} />
            <div className="text-[11px] font-mono truncate max-w-[140px]">
              {primarySpeakerName ? (
                <span className="text-zinc-200 font-medium flex items-center gap-1">
                  <span className="truncate">{primarySpeakerName}</span>
                  {totalSpeakers > 1 && (
                    <span className="text-[9px] text-zinc-500">+{totalSpeakers - 1}</span>
                  )}
                </span>
              ) : (
                <span className="text-zinc-500">Mesh quiet</span>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right: Interactive Audio & Media Controls */}
        <div className="flex items-center gap-1.5 bg-[var(--bg-main)] border border-[var(--border-subtle)] p-1 rounded-xl relative">
          
          {/* Mute Microphone Toggle */}
          <button
            onClick={() => localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled)}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
              !isMicrophoneEnabled
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : isLocalSpeaking
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
            title={isMicrophoneEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {!isMicrophoneEnabled ? (
              <MicOff className="w-4 h-4 text-rose-400" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Deafen Toggle */}
          <button
            onClick={() => setDeafened(!deafened)}
            className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
              deafened
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : "text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
            title={deafened ? "Undeafen Audio" : "Deafen Audio"}
          >
            {deafened ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* Video Camera Toggle */}
          <button
            onClick={() => localParticipant?.setCameraEnabled(!isCameraEnabled)}
            className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
              isCameraEnabled
                ? "bg-[var(--accent-muted)] text-[var(--accent-color)] border border-[var(--accent-border)] shadow-sm"
                : "text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
            title={isCameraEnabled ? "Stop Camera Video" : "Start Camera Video"}
          >
            {isCameraEnabled ? (
              <Video className="w-4 h-4 text-[var(--accent-color)]" />
            ) : (
              <VideoOff className="w-4 h-4" />
            )}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={() => localParticipant?.setScreenShareEnabled(!isScreenShareEnabled)}
            className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
              isScreenShareEnabled
                ? "bg-[var(--accent-muted)] text-[var(--accent-color)] border border-[var(--accent-border)] shadow-sm"
                : "text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
            title={isScreenShareEnabled ? "Stop Screen Projection" : "Project Screen"}
          >
            {isScreenShareEnabled ? (
              <MonitorOff className="w-4 h-4 text-[var(--accent-color)]" />
            ) : (
              <MonitorUp className="w-4 h-4" />
            )}
          </button>

          {/* Audio Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
              showSettings
                ? "bg-[var(--accent-muted)] text-[var(--accent-color)] border border-[var(--accent-border)]"
                : "text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
            title="Audio Hardware & Devices"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          {/* Leave / Disconnect Button */}
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-rose-950/50 cursor-pointer active:scale-95"
            title="Disconnect from Voice Room"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>

          {/* Floating Audio Hardware Settings Popover */}
          {showSettings && (
            <div
              ref={settingsRef}
              className="absolute bottom-full right-0 mb-3 w-72 p-3.5 rounded-2xl bg-[var(--bg-popover)] border border-[var(--border-card)] shadow-2xl shadow-black/90 text-zinc-100 font-mono text-xs z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-3">
                <span className="text-[11px] font-bold text-zinc-100 flex items-center gap-1.5 uppercase">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                  Audio Devices
                </span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Microphone Input Selector */}
                {audioInputDevices.length > 0 && (
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">
                      Input Microphone
                    </label>
                    <select
                      value={selectedInputId}
                      onChange={(e) => handleDeviceChange("audioinput", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-[11px] text-zinc-200 outline-none focus:border-[var(--accent-color)] font-mono transition"
                    >
                      {audioInputDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId} className="bg-[var(--bg-card)] text-zinc-100">
                          {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Output Speaker Selector */}
                {audioOutputDevices.length > 0 && (
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase mb-1 block">
                      Output Speaker
                    </label>
                    <select
                      value={selectedOutputId}
                      onChange={(e) => handleDeviceChange("audiooutput", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-[11px] text-zinc-200 outline-none focus:border-[var(--accent-color)] font-mono transition"
                    >
                      {audioOutputDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId} className="bg-[var(--bg-card)] text-zinc-100">
                          {d.label || `Speaker ${d.deviceId.slice(0, 5)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] text-[9px] text-zinc-500 flex items-center justify-between">
                <span>HD Audio Mesh Active</span>
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Floating Right-Click Context Menu from Audio Dock */}
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
