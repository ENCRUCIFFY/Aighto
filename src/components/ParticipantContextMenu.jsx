import { useState, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  Volume1,
  Activity,
  X,
} from "lucide-react";

export default function ParticipantContextMenu({
  participant,
  position = { x: 0, y: 0 },
  onClose,
  isLocal = false,
}) {
  const menuRef = useRef(null);

  // Load saved volume preference from localStorage
  const savedVolumeKey = participant?.identity ? `aighto_vol_${participant.identity}` : null;
  const initialVolume = savedVolumeKey
    ? Number(localStorage.getItem(savedVolumeKey) ?? 100)
    : 100;

  const [volume, setVolume] = useState(initialVolume);
  const [isMutedLocally, setIsMutedLocally] = useState(initialVolume === 0);

  // Adjust volume on participant's audio track & elements
  const applyVolume = (newVolume) => {
    setVolume(newVolume);
    setIsMutedLocally(newVolume === 0);

    if (savedVolumeKey) {
      localStorage.setItem(savedVolumeKey, String(newVolume));
    }

    // Apply to remote audio track publications if available
    try {
      if (participant?.audioTrackPublications) {
        participant.audioTrackPublications.forEach((pub) => {
          if (pub.track && typeof pub.track.setVolume === "function") {
            pub.track.setVolume(newVolume / 100);
          }
        });
      }

      // Also adjust any audio elements associated with this participant
      const audioElements = document.querySelectorAll("audio");
      audioElements.forEach((audio) => {
        // Match audio element if related to this participant
        if (audio.dataset?.participantIdentity === participant?.identity) {
          audio.volume = Math.min(1, newVolume / 100);
        }
      });
    } catch (e) {
      console.warn("Could not set participant audio volume directly:", e);
    }
  };

  const toggleLocalMute = () => {
    if (isMutedLocally) {
      applyVolume(100);
    } else {
      applyVolume(0);
    }
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!participant) return null;

  // Calculate clamped screen position so menu never overflows viewport
  const menuWidth = 240;
  const menuHeight = 220;
  const clampedX = Math.min(Math.max(10, position.x), window.innerWidth - menuWidth - 10);
  const clampedY = Math.min(Math.max(10, position.y), window.innerHeight - menuHeight - 10);

  const displayName = participant.name || participant.identity || "Unknown User";

  return (
    <div
      ref={menuRef}
      style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
      className="fixed z-50 w-60 rounded-2xl bg-[var(--bg-popover)] border border-[var(--border-card)] shadow-2xl shadow-black/90 p-3.5 text-zinc-100 font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header Profile Info */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 truncate">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-xs font-bold text-[var(--accent-color)] shrink-0">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="truncate">
            <p className="font-medium text-zinc-100 truncate text-[11px] leading-tight">
              {displayName}
            </p>
            <span className="text-[9px] text-zinc-400 flex items-center gap-1">
              <Activity className="w-2.5 h-2.5 text-[var(--accent-color)]" />
              {isLocal ? "Local User" : "Remote Node"}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Audio Controls (Only relevant for remote participants) */}
      {!isLocal ? (
        <div className="space-y-3">
          {/* User Volume Slider */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-zinc-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                {volume === 0 ? (
                  <VolumeX className="w-3 h-3 text-rose-400" />
                ) : volume > 100 ? (
                  <Volume2 className="w-3 h-3 text-[var(--accent-color)]" />
                ) : (
                  <Volume1 className="w-3 h-3 text-zinc-400" />
                )}
                User Volume
              </span>
              <span className="font-bold text-white">{volume}%</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="200"
                step="1"
                value={volume}
                onChange={(e) => applyVolume(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[var(--accent-color)]"
              />
            </div>
            <div className="flex justify-between text-[8px] text-zinc-500 mt-1">
              <span>0% (Mute)</span>
              <span>100% (Default)</span>
              <span>200% (Boost)</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => applyVolume(100)}
              className="py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 transition cursor-pointer"
            >
              Reset 100%
            </button>
            <button
              onClick={() => applyVolume(150)}
              className="py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-zinc-300 transition cursor-pointer"
            >
              Boost 150%
            </button>
            <button
              onClick={toggleLocalMute}
              className={`py-1 rounded-lg border text-[10px] transition cursor-pointer ${
                isMutedLocally
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300"
              }`}
            >
              {isMutedLocally ? "Unmute" : "Mute"}
            </button>
          </div>
        </div>
      ) : (
        <div className="py-2 text-center text-zinc-400 text-[10px]">
          Use the main audio dock to adjust your local microphone and output hardware.
        </div>
      )}
    </div>
  );
}
