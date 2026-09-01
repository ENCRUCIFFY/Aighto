import { useState, useRef, useEffect } from "react";
import { useMusicPlayer } from "../MusicPlayerContext";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Disc3,
  HardDrive,
  Minimize2,
  Sliders,
  ListMusic,
  X,
  Sparkles,
  Shuffle,
  Repeat,
  Repeat1,
  Palette,
} from "lucide-react";

function formatTime(seconds) {
  if (isNaN(seconds) || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function RetrowaveRadioModal({ isOpen, onClose }) {
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
    userTracks,
    radioMetadata,
    getAudioFrequencyData,
    initAudioAnalyser,
    currentTime,
    duration,
    seekTo,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeatMode,
    visualizerTheme,
    cycleVisualizerTheme,
    visualizerThemes,
    cycleEqPreset,
    currentEqPresetObj,
  } = useMusicPlayer();

  const [isTrackDrawerOpen, setIsTrackDrawerOpen] = useState(false);
  const [selectedDrawerTab, setSelectedDrawerTab] = useState("official"); // "official" | "user"

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const peaksRef = useRef(new Array(32).fill(4));
  const smoothedBarsRef = useRef(new Array(32).fill(4));

  // Escape key listener to exit fullscreen
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Make sure audio analyser is initialized on open
  useEffect(() => {
    if (isOpen) {
      initAudioAnalyser();
    }
  }, [isOpen, initAudioAnalyser]);

  // Live Canvas 32-Band Visualizer & Equalizer Loop
  useEffect(() => {
    if (!isOpen) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let isRunning = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const dataArray = new Uint8Array(256);

    const render = () => {
      if (!isRunning || !canvas || !ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      getAudioFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      // Draw background grid lines (2000s cyber HUD grid)
      ctx.strokeStyle = "rgba(168, 85, 247, 0.08)";
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const barCount = 32;
      const barSpacing = 4;
      const totalBarWidth = (width - (barCount + 1) * barSpacing) / barCount;
      const peaks = peaksRef.current;
      const smoothed = smoothedBarsRef.current;

      // Dynamic volume scaling (preserves fluidity across low, medium, and high volumes)
      const volRatio = isMuted ? 0 : Math.max(0.08, volume / 100);
      const volScale = Math.pow(volRatio, 0.38);

      // Compute live audio energy and bass transient power from the active stream
      let totalEnergy = 0;
      let bassEnergy = 0;
      for (let b = 0; b < 128; b++) {
        const val = dataArray[b] || 0;
        totalEnergy += val;
        if (b < 16) bassEnergy += val;
      }

      const avgEnergy = totalEnergy / (128 * 255); // 0.0 to 1.0
      const bassRatio = bassEnergy / (16 * 255);  // 0.0 to 1.0
      const time = performance.now() * 0.001;

      for (let i = 0; i < barCount; i++) {
        // 2000s Retro Radio Cascading Wave Harmonics (staggered phase so bars never bounce in unison)
        const wave1 = Math.sin(i * 0.44 - time * 5.2) * 0.32;
        const wave2 = Math.cos(i * 0.28 + time * 3.4) * 0.24;
        const wave3 = Math.sin(i * 0.85 - time * 7.1) * 0.16;
        const dynamicPattern = Math.max(0.18, 0.52 + wave1 + wave2 + wave3);

        // Local harmonic bin coupling for organic transient reactivity
        const localBinIdx = Math.min(127, Math.floor(i * 3.2 + 2));
        const localAudioVal = (dataArray[localBinIdx] || 0) / 255;

        // Combined audio-driven signal
        const liveSignal = isPlaying
          ? (avgEnergy * 0.40 + bassRatio * 0.35 + localAudioVal * 0.45) * dynamicPattern
          : 0;

        // Retro stereo dome contour (subtle rise in the center, balanced on flanks)
        const contour = 0.75 + Math.sin((i / (barCount - 1)) * Math.PI) * 0.35;

        // Scale by volume and apply soft-knee saturation
        const rawScaled = liveSignal * contour * volScale * 1.55;
        const compressed = Math.tanh(rawScaled * 1.2) * 0.82;

        const targetBarHeight = isPlaying ? Math.max(0, compressed * (height * 0.78)) : 0;

        // Liquid ballistics smoothing (fast attack, natural fluid decay)
        if (targetBarHeight > smoothed[i]) {
          smoothed[i] = smoothed[i] * 0.30 + targetBarHeight * 0.70;
        } else {
          smoothed[i] = isPlaying ? smoothed[i] * 0.76 + targetBarHeight * 0.24 : smoothed[i] * 0.58;
        }

        if (smoothed[i] < 0.5) smoothed[i] = 0;

        const barHeight = smoothed[i];

        if (barHeight > peaks[i]) {
          peaks[i] = barHeight;
        } else {
          peaks[i] = Math.max(barHeight, peaks[i] - (isPlaying ? 1.4 : 3.0));
        }

        if (peaks[i] < 0.5) peaks[i] = 0;

        // If completely idle/flat, skip drawing rectangles
        if (barHeight < 1 && peaks[i] < 1) continue;

        const x = barSpacing + i * (totalBarWidth + barSpacing);
        const y = height - barHeight - 16;

        const themeConfig = visualizerThemes?.[visualizerTheme] || {
          start: "#00f0ff",
          mid: "#a855f7",
          end: "#ff007f",
          glow: "#d946ef",
          peak: "#ffffff",
          peakGlow: "#00f0ff",
        };

        if (barHeight >= 1) {
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, themeConfig.start);
          gradient.addColorStop(0.5, themeConfig.mid);
          gradient.addColorStop(1, themeConfig.end);

          ctx.fillStyle = gradient;
          ctx.shadowBlur = isPlaying ? 12 : 0;
          ctx.shadowColor = themeConfig.glow;
          ctx.fillRect(x, y, totalBarWidth, barHeight);

          // Draw Segment Separation Lines (Classic VFD/LED Grid Look)
          ctx.fillStyle = "rgba(7, 4, 15, 0.6)";
          for (let s = y; s < height - 16; s += 6) {
            ctx.fillRect(x, s, totalBarWidth, 1.5);
          }

          // Draw Floor Glow Reflection
          ctx.fillStyle = "rgba(217, 70, 239, 0.15)";
          ctx.shadowBlur = 0;
          ctx.fillRect(x, height - 12, totalBarWidth, Math.min(10, barHeight * 0.2));
        }

        // Draw Falling Peak Cap
        if (peaks[i] >= 2) {
          ctx.fillStyle = themeConfig.peak;
          ctx.shadowBlur = 8;
          ctx.shadowColor = themeConfig.peakGlow;
          ctx.fillRect(x, height - peaks[i] - 20, totalBarWidth, 2.5);
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, isPlaying, getAudioFrequencyData, volume, isMuted, visualizerTheme, visualizerThemes]);

  if (!isOpen) return null;

  const themeConfig = visualizerThemes?.[visualizerTheme] || {
    id: "neon",
    name: "Cyber Neon",
    start: "#00f0ff",
    mid: "#a855f7",
    end: "#ff007f",
    glow: "#d946ef",
    peak: "#ffffff",
    peakGlow: "#00f0ff",
    accentColor: "#00f0ff",
    secondaryAccent: "#d946ef",
    artistColor: "#d946ef",
    titleGradient: "from-cyan-300 via-fuchsia-300 to-purple-200",
    playBtnGradient: "from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500",
    activeShadow: "0 0 20px rgba(217,70,239,0.5)",
    vfdGlow: "0 0 30px rgba(217,70,239,0.25), inset 0 0 20px rgba(6,182,212,0.15)",
    vfdBorder: "rgba(217, 70, 239, 0.35)",
    tunerBg: "#0b0617",
    tunerBorder: "rgba(6, 182, 212, 0.45)",
    tunerText: "#22d3ee",
    tunerShadow: "0 0 10px rgba(6,182,212,0.4)",
    badgeBg: "bg-fuchsia-950/80 border-fuchsia-500/40 text-fuchsia-300",
    activePreset: "bg-fuchsia-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] border border-fuchsia-400",
    activeControl: "bg-fuchsia-600/30 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.5)]",
    horizonBackdrop: "radial-gradient(circle at 50% 20%, rgba(217,70,239,0.25) 0%, rgba(11,6,23,0.95) 70%, #05020a 100%)",
  };

  const displaySongTitle = currentTrack?.isRadio && radioMetadata?.name
    ? radioMetadata.name
    : currentTrack?.name || "No Track Selected";

  const displayArtist = currentTrack?.isRadio
    ? radioMetadata?.artist || "CHILLSYNTH FM 24/7"
    : currentTrack?.artist || "Curated Audio";

  const isRadio = Boolean(currentTrack?.isRadio);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#07040f] overflow-hidden flex flex-col font-mono select-none text-purple-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Background Synthwave Horizon Wireframe & Radial Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{ background: themeConfig.horizonBackdrop }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-[linear-gradient(to_bottom,transparent_0%,rgba(168,85,247,0.15)_100%)]" />
      </div>

      {/* Immersive CRT Scanline & VHS Tube Overlay */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
        {/* CRT Horizontal Raster Scanlines */}
        <div
          className="absolute inset-0 opacity-35"
          style={{
            background: "linear-gradient(rgba(18, 16, 26, 0) 50%, rgba(0, 0, 0, 0.45) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))",
            backgroundSize: "100% 4px, 6px 100%",
          }}
        />
        {/* CRT Glass Tube Vignette & Ambient Radial Glow */}
        <div
          className="absolute inset-0"
          style={{
            boxShadow: `inset 0 0 140px rgba(0, 0, 0, 0.85), inset 0 0 60px ${themeConfig.glow}20`,
          }}
        />
      </div>

      {/* Top Deck Bar */}
      <header className="h-16 px-6 border-b border-purple-500/20 bg-[#0c0817]/90 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl border flex items-center justify-center text-white shadow-lg transition-all"
            style={{
              borderColor: `${themeConfig.accentColor}80`,
              background: `linear-gradient(135deg, ${themeConfig.mid} 0%, ${themeConfig.start} 100%)`,
              boxShadow: `0 0 15px ${themeConfig.glow}50`,
            }}
          >
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-widest uppercase">
                AIGHTO
              </h1>
              <span className={`text-[9px] px-2 py-0.5 rounded font-bold tracking-wider ${themeConfig.badgeBg}`}>
                RETRO AUDIO DECK
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={cycleEqPreset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18102b] hover:bg-purple-900/60 border text-white text-xs transition-all cursor-pointer shadow-sm"
            style={{
              borderColor: `${themeConfig.secondaryAccent}70`,
              boxShadow: `0 0 10px ${themeConfig.glow}25`,
            }}
            title={`Audio DSP EQ: ${currentEqPresetObj.name} (${currentEqPresetObj.desc})`}
          >
            <Sliders className="w-3.5 h-3.5" style={{ color: themeConfig.secondaryAccent }} />
            <span className="font-bold" style={{ color: themeConfig.secondaryAccent }}>
              EQ: {currentEqPresetObj.shortName}
            </span>
          </button>

          <button
            onClick={cycleVisualizerTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18102b] hover:bg-purple-900/60 border text-white text-xs transition-all cursor-pointer"
            style={{
              borderColor: `${themeConfig.accentColor}70`,
              boxShadow: `0 0 12px ${themeConfig.glow}35`,
            }}
            title="Cycle Palette Theme"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: themeConfig.accentColor }} />
            <span className="hidden sm:inline font-bold" style={{ color: themeConfig.accentColor }}>
              {themeConfig.name}
            </span>
          </button>

          <button
            onClick={() => setIsTrackDrawerOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18102b] hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 hover:text-white text-xs transition-colors cursor-pointer"
          >
            <ListMusic className="w-3.5 h-3.5" style={{ color: themeConfig.secondaryAccent }} />
            <span>Track Vault</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/30 text-purple-200 hover:text-white text-xs transition-colors cursor-pointer"
            title="Minimize to workspace (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5 text-purple-300" />
            <span>Minimize (Esc)</span>
          </button>
        </div>
      </header>

      {/* Main Retrowave Boombox / Radio Center */}
      <main className="flex-1 flex flex-col items-center justify-between p-4 md:p-8 max-w-5xl mx-auto w-full z-10 min-h-0 overflow-y-auto">

        {/* 1. 2000s VFD Cyber Digital Display */}
        <div
          className="w-full rounded-2xl bg-[#030208] border-2 p-5 relative overflow-hidden shrink-0 mb-3 transition-all duration-500"
          style={{
            borderColor: themeConfig.vfdBorder,
            boxShadow: themeConfig.vfdGlow,
          }}
        >
          {/* VFD Glass Glare line */}
          <div
            className="absolute top-0 left-0 right-0 h-1 transition-all duration-500"
            style={{
              background: `linear-gradient(to right, transparent, ${themeConfig.accentColor}80, transparent)`,
            }}
          />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-purple-500/20 pb-4 mb-4">
            {/* Tuner Indicator */}
            <div className="flex items-center gap-3">
              <div
                className="px-3 py-1 rounded font-bold text-xs transition-all duration-500"
                style={{
                  backgroundColor: themeConfig.tunerBg,
                  border: `1px solid ${themeConfig.tunerBorder}`,
                  color: themeConfig.tunerText,
                  boxShadow: themeConfig.tunerShadow,
                }}
              >
                {isRadio ? "FM 104.7 MHz" : currentTrack?.isUserLocal ? "VAULT / TAPE A" : "OFFICIAL DISC 1"}
              </div>
              <div className="flex items-center gap-2 text-[10px] tracking-widest font-bold">
                <span className={`px-1.5 py-0.5 rounded ${themeConfig.badgeBg}`}>
                  STEREO
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
                  320 KBPS
                </span>
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${themeConfig.mid}25`,
                    border: `1px solid ${themeConfig.accentColor}50`,
                    color: themeConfig.accentColor,
                  }}
                >
                  DOLBY NR
                </span>
              </div>
            </div>

            {/* Status / Listeners Flag */}
            <div className="flex items-center gap-2 text-[10px] text-purple-300/80">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" : "bg-amber-400"}`} />
              <span>{isLoading ? "TUNING FREQUENCY..." : isPlaying ? "ACTIVE STREAM" : "STANDBY"}</span>
              {isRadio && radioMetadata?.listeners > 0 && (
                <span className="ml-2 font-bold" style={{ color: themeConfig.accentColor }}>
                  ({radioMetadata.listeners} listeners)
                </span>
              )}
            </div>
          </div>

          {/* Glowing Track Marquee */}
          <div className="flex flex-col gap-1 py-1">
            <span className="text-[10px] uppercase tracking-widest text-purple-400/60 font-semibold">
              NOW BROADCASTING
            </span>
            {(() => {
              const isLongTitle = displaySongTitle.length > 22;
              const scrollDist = Math.max(15, Math.min(75, (displaySongTitle.length - 20) * 3.2));
              return (
                <div
                  className="w-full overflow-hidden relative py-0.5"
                  style={{
                    maskImage: isLongTitle
                      ? "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)"
                      : "none",
                    WebkitMaskImage: isLongTitle
                      ? "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)"
                      : "none",
                  }}
                >
                  <div
                    className={isLongTitle ? "animate-vfd-marquee whitespace-nowrap inline-block pr-12" : "w-full"}
                    style={isLongTitle ? { "--marquee-dist": `-${scrollDist}%` } : undefined}
                  >
                    <h2
                      className={`text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${themeConfig.titleGradient} tracking-wider transition-all duration-500`}
                      style={{
                        filter: `drop-shadow(0 0 12px ${themeConfig.glow})`,
                      }}
                    >
                      {displaySongTitle}
                    </h2>
                  </div>
                </div>
              );
            })()}
            {(() => {
              const artistFormatted = `BY ${displayArtist.toUpperCase()}`;
              const isLongArtist = artistFormatted.length > 28;
              const scrollDist = Math.max(15, Math.min(65, (artistFormatted.length - 24) * 3.5));

              return (
                <div
                  className="w-full overflow-hidden whitespace-nowrap"
                  style={{
                    maskImage: isLongArtist
                      ? "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)"
                      : "none",
                    WebkitMaskImage: isLongArtist
                      ? "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)"
                      : "none",
                  }}
                >
                  <div
                    className={isLongArtist ? "animate-vfd-marquee whitespace-nowrap inline-block pr-12" : "w-full"}
                    style={isLongArtist ? { "--marquee-dist": `-${scrollDist}%` } : undefined}
                  >
                    <p
                      className="text-xs md:text-sm font-bold tracking-wide transition-all duration-500"
                      style={{
                        color: themeConfig.artistColor,
                        textShadow: `0 0 8px ${themeConfig.glow}`,
                      }}
                    >
                      {artistFormatted}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {playbackError && (
            <div className="mt-3 p-2 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs">
              TUNER ALERT: {playbackError}
            </div>
          )}
        </div>

        {/* Interactive Glow Timeline Scrubber */}
        {!isRadio ? (
          <div className="w-full rounded-2xl bg-[#090514]/90 border border-purple-500/20 px-4 py-2.5 shadow-lg flex flex-col gap-1.5 mb-3 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold">
              <span style={{ color: themeConfig.accentColor }}>{formatTime(currentTime)}</span>
              <span className="text-[10px] text-purple-400/60 uppercase tracking-wider">
                {currentTrack?.isUserLocal ? "MY MUSIC VAULT FILE" : "CURATED PLAYLIST TRACK"}
              </span>
              <span style={{ color: themeConfig.secondaryAccent }}>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              style={{ accentColor: themeConfig.accentColor }}
              className="w-full bg-purple-950/80 h-2 rounded-lg cursor-pointer transition-all"
            />
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-[#090514]/90 border border-purple-500/20 px-4 py-2 shadow-lg flex items-center justify-between text-xs font-mono mb-3 shrink-0">
            <div className="flex items-center gap-2 font-bold text-xs" style={{ color: themeConfig.accentColor }}>
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: themeConfig.accentColor,
                  boxShadow: `0 0 10px ${themeConfig.accentColor}`,
                }}
              />
              <span className="tracking-widest">LIVE 24/7 BROADCAST</span>
            </div>
            <span className="text-[10px] text-purple-400/60 hidden sm:inline">STEREO • 320 KBPS LIVE FEED</span>
          </div>
        )}

        {/* 2. 32-Band Live Frequency Visualizer & Equalizer Canvas */}
        <div className="w-full flex-1 rounded-2xl bg-[#090514]/90 border border-purple-500/20 p-4 shadow-xl flex flex-col justify-between min-h-[160px] max-h-[280px] mb-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-purple-400/60 pb-2 border-b border-purple-500/10">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" style={{ color: themeConfig.secondaryAccent }} />
              <span>32-BAND ANALYSER</span>
            </span>
            <span>20Hz — 20kHz</span>
          </div>

          {/* Spectrum Canvas */}
          <div className="flex-1 w-full flex items-center justify-center overflow-hidden pt-2">
            <canvas
              ref={canvasRef}
              width={760}
              height={180}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* 3. Tactile 2000s Audio Deck Controls */}
        <div className="w-full rounded-2xl bg-[#110b22] border border-purple-500/25 p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 w-full md:w-auto justify-center">
            <button
              onClick={() => playTrack(officialRadio[0])}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isRadio
                ? themeConfig.activePreset
                : "bg-[#18102b] text-purple-300 hover:bg-purple-900/50 border border-purple-500/20"
                }`}
            >
              1: CHILLSYNTH FM
            </button>

            <button
              onClick={() => {
                if (playlistTracks.length > 0) playTrack(playlistTracks[0]);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${!isRadio && !currentTrack?.isUserLocal && currentTrack
                ? themeConfig.activePreset
                : "bg-[#18102b] text-purple-300 hover:bg-purple-900/50 border border-purple-500/20"
                }`}
            >
              2: OFFICIAL DISC
            </button>

            <button
              onClick={() => {
                if (userTracks.length > 0) playTrack(userTracks[0]);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentTrack?.isUserLocal
                ? themeConfig.activePreset
                : "bg-[#18102b] text-purple-300 hover:bg-purple-900/50 border border-purple-500/20"
                }`}
            >
              3: MY VAULT ({userTracks.length})
            </button>
          </div>

          {/* Center Playback Transport Deck with Shuffle & Repeat */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleShuffle}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${isShuffle
                ? themeConfig.activeControl
                : "bg-[#18102b] border-purple-500/25 text-purple-400 hover:text-purple-200"
                }`}
              title={`Shuffle: ${isShuffle ? "ON" : "OFF"}`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={prevTrack}
              className="p-3 rounded-2xl bg-[#18102b] hover:bg-purple-900/60 border border-purple-500/25 text-purple-200 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
              title="Previous Track (Alt+Left)"
            >
              <SkipBack className="w-5 h-5" style={{ color: themeConfig.secondaryAccent }} />
            </button>

            <button
              onClick={togglePlay}
              className={`px-6 py-3 rounded-2xl bg-gradient-to-r ${themeConfig.playBtnGradient} text-white font-black text-sm flex items-center gap-2 active:scale-95 cursor-pointer transition-all`}
              style={{
                boxShadow: themeConfig.activeShadow,
              }}
              title="Play / Pause (Space)"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>PLAY</span>
                </>
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-3 rounded-2xl bg-[#18102b] hover:bg-purple-900/60 border border-purple-500/25 text-purple-200 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
              title="Next Track (Alt+Right)"
            >
              <SkipForward className="w-5 h-5" style={{ color: themeConfig.secondaryAccent }} />
            </button>

            <button
              onClick={cycleRepeatMode}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer relative ${repeatMode !== "off"
                ? themeConfig.activeControl
                : "bg-[#18102b] border-purple-500/25 text-purple-400 hover:text-purple-200"
                }`}
              title={`Repeat: ${repeatMode.toUpperCase()}`}
            >
              {repeatMode === "one" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              {repeatMode !== "off" && (
                <span
                  className="absolute -top-1 -right-1 text-[8px] font-bold px-1 rounded-full text-white"
                  style={{ backgroundColor: themeConfig.secondaryAccent }}
                >
                  {repeatMode === "one" ? "1" : "ALL"}
                </span>
              )}
            </button>
          </div>

          {/* Volume Control Deck */}
          <div className="flex items-center gap-3 w-full md:w-56 bg-[#0c0817] p-2.5 rounded-xl border border-purple-500/20">
            <button
              onClick={toggleMute}
              className="p-1 hover:text-white text-purple-300 transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" style={{ color: themeConfig.secondaryAccent }} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{ accentColor: themeConfig.secondaryAccent }}
              className="w-full bg-purple-950 h-1.5 rounded-lg cursor-pointer"
            />
            <span
              className="text-[11px] font-bold w-8 text-right"
              style={{ color: themeConfig.artistColor }}
            >
              {isMuted ? 0 : volume}%
            </span>
          </div>
        </div>

        {/* Smart Voice Ducking & EQ Indicator Bar */}
        <div className="w-full mt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-purple-400/60 px-2 select-none">
          <div className="flex items-center gap-2">
            <Sliders className="w-3 h-3 text-fuchsia-400" />
            <span>DSP EQ: <button onClick={cycleEqPreset} className="font-bold text-purple-200 hover:text-white underline cursor-pointer">{currentEqPresetObj.name.toUpperCase()}</button> ({currentEqPresetObj.desc})</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Smart Ducking: {smartDucking ? "ACTIVE (-75% on call)" : "OFF"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={cycleEqPreset}
              className="text-fuchsia-400 hover:underline cursor-pointer"
            >
              Cycle EQ
            </button>
            <span>•</span>
            <button
              onClick={() => setSmartDucking(!smartDucking)}
              className="text-purple-300 hover:text-white hover:underline cursor-pointer"
            >
              Toggle Ducking
            </button>
          </div>
        </div>
      </main>

      {/* Sliding Track Vault Drawer (Right Side) */}
      {isTrackDrawerOpen && (
        <div
          onClick={() => setIsTrackDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 flex justify-end animate-in fade-in select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-[#110b22] border-l border-purple-500/25 p-5 flex flex-col shadow-2xl overflow-hidden font-mono"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <Disc3 className="w-5 h-5" style={{ color: themeConfig.secondaryAccent }} />
                <h3 className="font-bold text-white text-sm uppercase">Track Vault</h3>
              </div>
              <button
                onClick={() => setIsTrackDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-purple-900/50 text-purple-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex gap-1.5 p-1 bg-[#0a0614] rounded-xl border border-purple-500/20 mb-3 text-xs">
              <button
                onClick={() => setSelectedDrawerTab("official")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer text-center ${selectedDrawerTab === "official"
                  ? "bg-[#18102b] border border-purple-500/30 shadow-sm"
                  : "text-purple-400/70 hover:text-purple-200"
                  }`}
                style={selectedDrawerTab === "official" ? { color: themeConfig.accentColor } : undefined}
              >
                Official Playlist ({playlistTracks.length})
              </button>
              <button
                onClick={() => setSelectedDrawerTab("user")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-colors cursor-pointer text-center ${selectedDrawerTab === "user"
                  ? "bg-[#18102b] border border-purple-500/30 shadow-sm"
                  : "text-purple-400/70 hover:text-purple-200"
                  }`}
                style={selectedDrawerTab === "user" ? { color: themeConfig.accentColor } : undefined}
              >
                My Vault ({userTracks.length})
              </button>
            </div>

            {/* Tracks List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {selectedDrawerTab === "official" ? (
                playlistTracks.length === 0 ? (
                  <p className="text-xs text-purple-400/50 text-center py-6">
                    No official playlist tracks available.
                  </p>
                ) : (
                  playlistTracks.map((track, idx) => {
                    const isSelected = currentTrack?.id === track.id;
                    return (
                      <button
                        key={track.id || idx}
                        onClick={() => {
                          playTrack(track);
                          setIsTrackDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer text-left ${isSelected
                          ? "bg-[#18102b] border shadow-sm"
                          : "bg-[#0d081a] hover:bg-purple-900/40 border border-purple-500/10 text-purple-300/80"
                          }`}
                        style={isSelected ? { borderColor: `${themeConfig.secondaryAccent}80` } : undefined}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className="w-5 h-5 rounded bg-purple-950 text-[10px] flex items-center justify-center font-bold shrink-0"
                            style={{ color: themeConfig.accentColor }}
                          >
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="font-bold text-xs truncate leading-tight text-white">
                              {track.name}
                            </p>
                            <span className="text-[10px] text-purple-400/60 block">
                              {track.artist || "Official Track"}
                            </span>
                          </div>
                        </div>
                        <Play className="w-3.5 h-3.5 shrink-0" style={{ color: themeConfig.secondaryAccent }} />
                      </button>
                    );
                  })
                )
              ) : userTracks.length === 0 ? (
                <div className="text-center py-8 text-purple-400/50 text-xs space-y-2">
                  <HardDrive className="w-6 h-6 mx-auto text-purple-500/40" />
                  <p>No personal songs saved in local vault.</p>
                  <p className="text-[10px] text-purple-400/40">
                    Import files from the My Music tab in the main popover.
                  </p>
                </div>
              ) : (
                userTracks.map((track, idx) => {
                  const isSelected = currentTrack?.id === track.id;
                  return (
                    <button
                      key={track.id}
                      onClick={() => {
                        playTrack(track);
                        setIsTrackDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer text-left ${isSelected
                        ? "bg-[#18102b] border shadow-sm"
                        : "bg-[#0d081a] hover:bg-purple-900/40 border border-purple-500/10 text-purple-300/80"
                        }`}
                      style={isSelected ? { borderColor: `${themeConfig.secondaryAccent}80` } : undefined}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className="w-5 h-5 rounded bg-purple-950 text-[10px] flex items-center justify-center font-bold shrink-0"
                          style={{ color: themeConfig.accentColor }}
                        >
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="font-bold text-xs truncate leading-tight text-white">
                            {track.name}
                          </p>
                          <span className="text-[10px] text-purple-400/60 block">
                            {track.artist || "My Song"}
                          </span>
                        </div>
                      </div>
                      <Play className="w-3.5 h-3.5 shrink-0" style={{ color: themeConfig.secondaryAccent }} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
