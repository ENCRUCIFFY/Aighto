/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase";
import {
  OFFICIAL_RADIO,
  OFFICIAL_PLAYLIST,
  SUPABASE_STORAGE_BASE_URL,
  parseTrackFromFilename,
} from "./musicPresets";
import { useAppSettings } from "./AppSettingsContext";
import { invoke } from "@tauri-apps/api/core";
import {
  getUserTracksFromDB,
  saveUserTrackToDB,
  deleteUserTrackFromDB,
} from "./userMusicStorage";

async function updateDiscordPresence(data) {
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    try {
      await invoke("set_discord_music_presence", {
        title: data.title,
        artist: data.artist,
        station: data.station || null,
        startTimestamp: data.startTimestamp || null,
      });
    } catch {
      // Ignore if Discord is closed
    }
  }
}

async function clearDiscordPresence() {
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    try {
      await invoke("clear_discord_music_presence");
    } catch {
      // Ignore
    }
  }
}

const MusicPlayerContext = createContext(null);

const MUSIC_SETTINGS_KEY = "aighto_music_settings_v1";

export const VISUALIZER_THEMES = {
  neon: {
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
  },
  sunset: {
    id: "sunset",
    name: "Synth Sunset",
    start: "#fbbf24",
    mid: "#f43f5e",
    end: "#c084fc",
    glow: "#f43f5e",
    peak: "#fff1f2",
    peakGlow: "#fbbf24",
    accentColor: "#fbbf24",
    secondaryAccent: "#f43f5e",
    artistColor: "#fb7185",
    titleGradient: "from-amber-300 via-rose-300 to-violet-300",
    playBtnGradient: "from-amber-600 via-rose-600 to-purple-600 hover:from-amber-500 hover:to-rose-500",
    activeShadow: "0 0 20px rgba(244,63,94,0.5)",
    vfdGlow: "0 0 30px rgba(244,63,94,0.25), inset 0 0 20px rgba(251,191,36,0.15)",
    vfdBorder: "rgba(244, 63, 94, 0.35)",
    tunerBg: "#18080c",
    tunerBorder: "rgba(251, 191, 36, 0.5)",
    tunerText: "#fde047",
    tunerShadow: "0 0 10px rgba(251,191,36,0.4)",
    badgeBg: "bg-rose-950/80 border-rose-500/40 text-rose-300",
    activePreset: "bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] border border-rose-400",
    activeControl: "bg-rose-600/30 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.5)]",
    horizonBackdrop: "radial-gradient(circle at 50% 20%, rgba(244,63,94,0.25) 0%, rgba(18,6,12,0.95) 70%, #080205 100%)",
  },
  matrix: {
    id: "matrix",
    name: "Matrix VFD",
    start: "#10b981",
    mid: "#34d399",
    end: "#a7f3d0",
    glow: "#10b981",
    peak: "#ffffff",
    peakGlow: "#34d399",
    accentColor: "#10b981",
    secondaryAccent: "#34d399",
    artistColor: "#34d399",
    titleGradient: "from-emerald-300 via-teal-300 to-green-200",
    playBtnGradient: "from-emerald-700 via-teal-600 to-green-600 hover:from-emerald-600 hover:to-teal-500",
    activeShadow: "0 0 20px rgba(16,185,129,0.5)",
    vfdGlow: "0 0 30px rgba(16,185,129,0.25), inset 0 0 20px rgba(52,211,153,0.15)",
    vfdBorder: "rgba(16, 185, 129, 0.35)",
    tunerBg: "#04140b",
    tunerBorder: "rgba(16, 185, 129, 0.5)",
    tunerText: "#6ee7b7",
    tunerShadow: "0 0 10px rgba(16,185,129,0.4)",
    badgeBg: "bg-emerald-950/80 border-emerald-500/40 text-emerald-300",
    activePreset: "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400",
    activeControl: "bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    horizonBackdrop: "radial-gradient(circle at 50% 20%, rgba(16,185,129,0.22) 0%, rgba(4,18,10,0.95) 70%, #010804 100%)",
  },
  ice: {
    id: "ice",
    name: "Monochrome Ice",
    start: "#94a3b8",
    mid: "#e2e8f0",
    end: "#ffffff",
    glow: "#cbd5e1",
    peak: "#ffffff",
    peakGlow: "#ffffff",
    accentColor: "#f8fafc",
    secondaryAccent: "#cbd5e1",
    artistColor: "#cbd5e1",
    titleGradient: "from-slate-200 via-zinc-100 to-white",
    playBtnGradient: "from-slate-700 via-zinc-600 to-neutral-500 hover:from-slate-600 hover:to-zinc-500",
    activeShadow: "0 0 20px rgba(226,232,240,0.4)",
    vfdGlow: "0 0 30px rgba(226,232,240,0.2), inset 0 0 20px rgba(248,250,252,0.1)",
    vfdBorder: "rgba(203, 213, 225, 0.35)",
    tunerBg: "#0f172a",
    tunerBorder: "rgba(226, 232, 240, 0.5)",
    tunerText: "#f1f5f9",
    tunerShadow: "0 0 10px rgba(226,232,240,0.4)",
    badgeBg: "bg-slate-900/90 border-slate-500/40 text-slate-200",
    activePreset: "bg-slate-700 text-white shadow-[0_0_15px_rgba(226,232,240,0.4)] border border-slate-400",
    activeControl: "bg-slate-700/40 border-slate-400 text-slate-200 shadow-[0_0_12px_rgba(226,232,240,0.4)]",
    horizonBackdrop: "radial-gradient(circle at 50% 20%, rgba(203,213,225,0.18) 0%, rgba(15,23,42,0.95) 70%, #030712 100%)",
  },
  violet: {
    id: "violet",
    name: "Cyber Violet",
    start: "#6366f1",
    mid: "#818cf8",
    end: "#c084fc",
    glow: "#818cf8",
    peak: "#ffffff",
    peakGlow: "#818cf8",
    accentColor: "#818cf8",
    secondaryAccent: "#c084fc",
    artistColor: "#a5b4fc",
    titleGradient: "from-indigo-300 via-violet-300 to-fuchsia-200",
    playBtnGradient: "from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-violet-500",
    activeShadow: "0 0 20px rgba(129,140,248,0.5)",
    vfdGlow: "0 0 30px rgba(129,140,248,0.25), inset 0 0 20px rgba(192,132,252,0.15)",
    vfdBorder: "rgba(129, 140, 248, 0.35)",
    tunerBg: "#09081e",
    tunerBorder: "rgba(129, 140, 248, 0.5)",
    tunerText: "#a5b4fc",
    tunerShadow: "0 0 10px rgba(129,140,248,0.4)",
    badgeBg: "bg-indigo-950/80 border-indigo-500/40 text-indigo-300",
    activePreset: "bg-indigo-600 text-white shadow-[0_0_15px_rgba(129,140,248,0.5)] border border-indigo-400",
    activeControl: "bg-indigo-600/30 border-indigo-400 text-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.5)]",
    horizonBackdrop: "radial-gradient(circle at 50% 20%, rgba(129,140,248,0.25) 0%, rgba(9,8,30,0.95) 70%, #03020c 100%)",
  },
};

export const VISUALIZER_THEME_KEYS = ["neon", "sunset", "matrix", "ice", "violet"];

export const EQ_PRESETS = [
  {
    id: "flat",
    name: "Flat Studio",
    shortName: "FLAT",
    desc: "Neutral reference curve",
    lowGain: 0,
    lowFreq: 80,
    midGain: 0,
    midFreq: 1500,
    highGain: 0,
    highFreq: 8000,
  },
  {
    id: "bass",
    name: "Bass Boost",
    shortName: "BASS +6dB",
    desc: "Punchy low-end sub boost",
    lowGain: 6.5,
    lowFreq: 80,
    midGain: -1.0,
    midFreq: 1200,
    highGain: 1.5,
    highFreq: 8000,
  },
  {
    id: "cassette",
    name: "Cassette Tape",
    shortName: "TAPE WARMTH",
    desc: "Warm analogue tape saturation",
    lowGain: 3.5,
    lowFreq: 120,
    midGain: 2.5,
    midFreq: 800,
    highGain: -4.5,
    highFreq: 6000,
  },
  {
    id: "vocal",
    name: "Vocal Clarity",
    shortName: "VOCAL",
    desc: "Targeted mid-range presence",
    lowGain: -2.0,
    lowFreq: 100,
    midGain: 4.5,
    midFreq: 2500,
    highGain: 3.0,
    highFreq: 10000,
  },
  {
    id: "cyber",
    name: "Cyber Synth",
    shortName: "CYBER V-SHAPE",
    desc: "Synthwave scoop & airy highs",
    lowGain: 5.5,
    lowFreq: 60,
    midGain: -3.0,
    midFreq: 600,
    highGain: 5.0,
    highFreq: 12000,
  },
];

const EQ_PRESET_STORAGE_KEY = "aighto_music_eq_preset_v1";

export function MusicPlayerProvider({ children, isVoiceConnected = false }) {
  const { settings } = useAppSettings();
  const [currentTrack, setCurrentTrack] = useState(() => OFFICIAL_RADIO[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState(() => OFFICIAL_PLAYLIST);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [userTracks, setUserTracks] = useState([]);
  const [isImportingUserTracks, setIsImportingUserTracks] = useState(false);
  const [radioMetadata, setRadioMetadata] = useState(null);

  // Time & Seeking
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Playback Options
  const [isShuffle, setIsShuffle] = useState(() => {
    try {
      const saved = localStorage.getItem(MUSIC_SETTINGS_KEY);
      if (saved) return Boolean(JSON.parse(saved).isShuffle);
    } catch {
      // Fallback
    }
    return false;
  });

  const [repeatMode, setRepeatMode] = useState(() => {
    try {
      const saved = localStorage.getItem(MUSIC_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (["off", "all", "one"].includes(parsed.repeatMode)) return parsed.repeatMode;
      }
    } catch {
      // Fallback
    }
    return "off";
  });

  const [visualizerTheme, setVisualizerTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(MUSIC_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (VISUALIZER_THEMES[parsed.visualizerTheme]) return parsed.visualizerTheme;
      }
    } catch {
      // Fallback
    }
    return "neon";
  });

  const [volume, setVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem(MUSIC_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.volume === "number") return parsed.volume;
      }
    } catch {
      // Fallback
    }
    return 70;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [smartDucking, setSmartDucking] = useState(() => {
    try {
      const saved = localStorage.getItem(MUSIC_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.smartDucking === "boolean") return parsed.smartDucking;
      }
    } catch {
      // Fallback
    }
    return true;
  });
  const [playbackError, setPlaybackError] = useState(null);
  const [isFullscreenStage, setIsFullscreenStage] = useState(false);

  // 0ms Real-Time Hardware DSP EQ Preset
  const [eqPreset, setEqPreset] = useState(() => {
    try {
      return localStorage.getItem(EQ_PRESET_STORAGE_KEY) || "flat";
    } catch {
      return "flat";
    }
  });

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const lowFilterRef = useRef(null);
  const midFilterRef = useRef(null);
  const highFilterRef = useRef(null);
  const trackStartTimestampRef = useRef(null);

  // Synchronize Discord Rich Presence (RPC)
  useEffect(() => {
    const isDiscordEnabled = settings?.discordRPC !== false;

    if (!isPlaying || !currentTrack || !isDiscordEnabled) {
      clearDiscordPresence();
      return;
    }

    if (!trackStartTimestampRef.current) {
      trackStartTimestampRef.current = Math.floor(Date.now() / 1000);
    }

    const songTitle = currentTrack?.isRadio && radioMetadata?.name
      ? radioMetadata.name
      : currentTrack?.name || "Background Audio";

    const artistName = currentTrack?.isRadio
      ? (radioMetadata?.artist || "CHILLSYNTH FM")
      : currentTrack?.artist || "Curated Audio";

    const stationName = currentTrack?.isRadio
      ? "CHILLSYNTH FM"
      : currentTrack?.isUserLocal
      ? "My Music Vault"
      : "Official Playlist";

    updateDiscordPresence({
      title: songTitle,
      artist: artistName,
      station: stationName,
      startTimestamp: trackStartTimestampRef.current,
    });
  }, [isPlaying, currentTrack, radioMetadata, settings?.discordRPC]);

  // Initialize Web Audio Analyser & 3-Band Parametric Hardware Filter Chain
  const initAudioAnalyser = useCallback(() => {
    if (analyserRef.current || !audioRef.current) {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.80;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      // 3-Band Biquad Filter Chain (LowShelf -> Peaking Mid -> HighShelf)
      const lowShelf = ctx.createBiquadFilter();
      lowShelf.type = "lowshelf";
      const midPeak = ctx.createBiquadFilter();
      midPeak.type = "peaking";
      const highShelf = ctx.createBiquadFilter();
      highShelf.type = "highshelf";

      const currentPresetObj = EQ_PRESETS.find((p) => p.id === eqPreset) || EQ_PRESETS[0];
      lowShelf.frequency.value = currentPresetObj.lowFreq;
      lowShelf.gain.value = currentPresetObj.lowGain;
      midPeak.frequency.value = currentPresetObj.midFreq;
      midPeak.gain.value = currentPresetObj.midGain;
      highShelf.frequency.value = currentPresetObj.highFreq;
      highShelf.gain.value = currentPresetObj.highGain;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(lowShelf);
      lowShelf.connect(midPeak);
      midPeak.connect(highShelf);
      highShelf.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      lowFilterRef.current = lowShelf;
      midFilterRef.current = midPeak;
      highFilterRef.current = highShelf;
    } catch (err) {
      console.warn("Could not attach audio analyser & EQ filters:", err);
    }
  }, [eqPreset]);

  // Smoothly update EQ parameters in real time when preset changes
  useEffect(() => {
    try {
      localStorage.setItem(EQ_PRESET_STORAGE_KEY, eqPreset);
    } catch {
      // Ignore
    }

    const preset = EQ_PRESETS.find((p) => p.id === eqPreset) || EQ_PRESETS[0];
    if (
      lowFilterRef.current &&
      midFilterRef.current &&
      highFilterRef.current &&
      audioContextRef.current
    ) {
      const now = audioContextRef.current.currentTime;
      lowFilterRef.current.frequency.setTargetAtTime(preset.lowFreq, now, 0.04);
      lowFilterRef.current.gain.setTargetAtTime(preset.lowGain, now, 0.04);

      midFilterRef.current.frequency.setTargetAtTime(preset.midFreq, now, 0.04);
      midFilterRef.current.gain.setTargetAtTime(preset.midGain, now, 0.04);

      highFilterRef.current.frequency.setTargetAtTime(preset.highFreq, now, 0.04);
      highFilterRef.current.gain.setTargetAtTime(preset.highGain, now, 0.04);
    }
  }, [eqPreset]);

  const cycleEqPreset = useCallback(() => {
    setEqPreset((prev) => {
      const idx = EQ_PRESETS.findIndex((p) => p.id === prev);
      const next = EQ_PRESETS[(idx + 1) % EQ_PRESETS.length].id;
      return next;
    });
  }, []);

  const getAudioFrequencyData = useCallback((dataArray) => {
    if (!analyserRef.current || !isPlaying) {
      dataArray.fill(0);
      return;
    }
    analyserRef.current.getByteFrequencyData(dataArray);
  }, [isPlaying]);

  // Load User-Imported Tracks from IndexedDB on startup
  useEffect(() => {
    let isMounted = true;
    getUserTracksFromDB()
      .then((tracks) => {
        if (isMounted) setUserTracks(tracks);
      })
      .catch((err) => console.warn("Error loading user tracks:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Supabase Storage Tracks from 'music' bucket
  const fetchSupabaseTracks = useCallback(async () => {
    try {
      const { data, error } = await supabase.storage.from("music").list("", {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        console.warn("Supabase music fetch error:", error);
        setPlaylistTracks(OFFICIAL_PLAYLIST);
        return;
      }

      if (data && data.length > 0) {
        const remoteTracks = data
          .filter((file) => file.name && !file.name.startsWith(".") && /\.(mp3|flac|wav|m4a|ogg|aac|webm)$/i.test(file.name))
          .map((file) => {
            const parsed = parseTrackFromFilename(file.name);
            return {
              id: `supabase-${file.name}`,
              name: parsed.name,
              artist: parsed.artist,
              genre: "Supabase Audio",
              url: `${SUPABASE_STORAGE_BASE_URL}/${encodeURIComponent(file.name)}`,
              filename: file.name,
            };
          });

        const combined = [...OFFICIAL_PLAYLIST];
        for (const r of remoteTracks) {
          if (!combined.some((c) => c.url === r.url || c.filename === r.filename)) {
            combined.push(r);
          }
        }
        setPlaylistTracks(combined);
      } else {
        setPlaylistTracks(OFFICIAL_PLAYLIST);
      }
    } catch (err) {
      console.warn("Error loading playlist from storage:", err);
      setPlaylistTracks(OFFICIAL_PLAYLIST);
    } finally {
      setIsLoadingPlaylist(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    supabase.storage
      .from("music")
      .list("", { limit: 100, sortBy: { column: "name", order: "asc" } })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn("Supabase music fetch error:", error);
          setPlaylistTracks(OFFICIAL_PLAYLIST);
          return;
        }
        if (data && data.length > 0) {
          const remoteTracks = data
            .filter((file) => file.name && !file.name.startsWith(".") && /\.(mp3|flac|wav|m4a|ogg|aac|webm)$/i.test(file.name))
            .map((file) => {
              const parsed = parseTrackFromFilename(file.name);
              return {
                id: `supabase-${file.name}`,
                name: parsed.name,
                artist: parsed.artist,
                genre: "Supabase Audio",
                url: `${SUPABASE_STORAGE_BASE_URL}/${encodeURIComponent(file.name)}`,
                filename: file.name,
              };
            });

          const combined = [...OFFICIAL_PLAYLIST];
          for (const r of remoteTracks) {
            if (!combined.some((c) => c.url === r.url || c.filename === r.filename)) {
              combined.push(r);
            }
          }
          setPlaylistTracks(combined);
        } else {
          setPlaylistTracks(OFFICIAL_PLAYLIST);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("Error loading playlist from storage:", err);
          setPlaylistTracks(OFFICIAL_PLAYLIST);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlaylist(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Poll Nightride FM metadata when CHILLSYNTH FM radio is active
  useEffect(() => {
    if (!currentTrack?.isRadio) return;

    let isCancelled = false;

    const fetchMetadata = async () => {
      try {
        const res = await fetch("https://stream.nightride.fm/status-json.xsl");
        if (!res.ok) return;
        const data = await res.json();
        const sources = data.icestats?.source || [];
        const chillsynth = sources.find((s) => s.listenurl && s.listenurl.includes("/chillsynth.mp3"));
        const rawTitle = chillsynth?.title || chillsynth?.["display-title"] || chillsynth?.metadata?.x_icy_title;
        if (rawTitle && !isCancelled) {
          const parsed = parseTrackFromFilename(rawTitle);
          setRadioMetadata({
            name: parsed.name,
            artist: parsed.artist,
            raw: rawTitle,
            listeners: chillsynth?.listeners || 0,
          });
        }
      } catch {
        // Silently ignore network error
      }
    };

    fetchMetadata();
    const interval = setInterval(fetchMetadata, 12000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      setRadioMetadata(null);
    };
  }, [currentTrack?.isRadio]);

  // Initialize HTML5 Audio Element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setPlaybackError(null);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };

    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setPlaybackError("Failed to stream audio track");
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        MUSIC_SETTINGS_KEY,
        JSON.stringify({
          volume,
          smartDucking,
          isShuffle,
          repeatMode,
          visualizerTheme,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [volume, smartDucking, isShuffle, repeatMode, visualizerTheme]);

  // Handle Volume & Smart Voice Ducking
  useEffect(() => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.volume = 0;
      return;
    }

    // Apply perceptual audio tapering (quadratic gain curve) so the entire 0-100% slider range has smooth, noticeable volume response
    const normalizedLinear = volume / 100;
    const perceptualGain = Math.pow(normalizedLinear, 2);
    const duckFactor = smartDucking && isVoiceConnected ? 0.25 : 1.0;
    const targetVolume = perceptualGain * duckFactor;
    audioRef.current.volume = Math.max(0, Math.min(1, targetVolume));
  }, [volume, isMuted, smartDucking, isVoiceConnected]);

  // Seek To Position
  const seekTo = useCallback((time) => {
    if (!audioRef.current || isNaN(time)) return;
    const clamped = Math.max(0, Math.min(duration || 1000, time));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  // Play any track (Radio, Official Playlist, or User Local File)
  const playTrack = useCallback((track) => {
    if (!track?.url || !audioRef.current) return;

    trackStartTimestampRef.current = Math.floor(Date.now() / 1000);
    setCurrentTime(0);
    setDuration(0);
    initAudioAnalyser();
    setPlaybackError(null);
    setCurrentTrack(track);
    setIsLoading(true);

    audioRef.current.src = track.url;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn("Audio play error:", err);
        setIsPlaying(false);
        setIsLoading(false);
        setPlaybackError("Unable to play audio");
      });
  }, [initAudioAnalyser]);

  // Import User Files from PC into IndexedDB
  const importUserFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    setIsImportingUserTracks(true);
    const addedTracks = [];

    for (const file of Array.from(files)) {
      if (/\.(mp3|flac|wav|m4a|ogg|aac|webm)$/i.test(file.name)) {
        try {
          const savedTrack = await saveUserTrackToDB(file);
          addedTracks.push(savedTrack);
        } catch (err) {
          console.warn("Error saving file to IndexedDB:", file.name, err);
        }
      }
    }

    if (addedTracks.length > 0) {
      setUserTracks((prev) => [...prev, ...addedTracks]);
      // If nothing is playing, start playing the first imported track
      if (!isPlaying) {
        playTrack(addedTracks[0]);
      }
    }

    setIsImportingUserTracks(false);
  }, [isPlaying, playTrack]);

  // Delete User Track from IndexedDB
  const removeUserTrack = useCallback(async (trackId) => {
    await deleteUserTrackFromDB(trackId);
    setUserTracks((prev) => prev.filter((t) => t.id !== trackId));
    if (currentTrack?.id === trackId) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTrack(null);
    }
  }, [currentTrack]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      initAudioAnalyser();
      if (!audioRef.current.src && currentTrack?.url) {
        audioRef.current.src = currentTrack.url;
      }
      setIsLoading(true);
      setPlaybackError(null);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn("Audio toggle play error:", err);
          setIsPlaying(false);
          setIsLoading(false);
          setPlaybackError("Unable to start audio");
        });
    }
  }, [isPlaying, currentTrack, initAudioAnalyser]);

  // Next Track: Cycles intelligently with shuffle and repeat support
  const nextTrack = useCallback(() => {
    // If playing from user's personal tracks
    if (currentTrack?.isUserLocal && userTracks.length > 0) {
      if (isShuffle && userTracks.length > 1) {
        let randIdx = Math.floor(Math.random() * userTracks.length);
        while (userTracks[randIdx]?.id === currentTrack.id) {
          randIdx = Math.floor(Math.random() * userTracks.length);
        }
        playTrack(userTracks[randIdx]);
        return;
      }
      const currentIndex = userTracks.findIndex((p) => p.id === currentTrack.id);
      const nextIndex = currentIndex === -1 || currentIndex >= userTracks.length - 1 ? 0 : currentIndex + 1;
      playTrack(userTracks[nextIndex]);
      return;
    }

    // If playing from official playlist
    if (playlistTracks.length > 0) {
      if (isShuffle && playlistTracks.length > 1) {
        let randIdx = Math.floor(Math.random() * playlistTracks.length);
        while (playlistTracks[randIdx]?.id === currentTrack?.id) {
          randIdx = Math.floor(Math.random() * playlistTracks.length);
        }
        playTrack(playlistTracks[randIdx]);
        return;
      }
      const currentIndex = playlistTracks.findIndex((p) => p.id === currentTrack?.id);
      const nextIndex = currentIndex === -1 || currentIndex >= playlistTracks.length - 1 ? 0 : currentIndex + 1;
      playTrack(playlistTracks[nextIndex]);
      return;
    }

    // Default to radio
    if (OFFICIAL_RADIO.length > 0) {
      playTrack(OFFICIAL_RADIO[0]);
    }
  }, [currentTrack, userTracks, playlistTracks, isShuffle, playTrack]);

  // Prev Track
  const prevTrack = useCallback(() => {
    if (currentTrack?.isUserLocal && userTracks.length > 0) {
      const currentIndex = userTracks.findIndex((p) => p.id === currentTrack.id);
      const prevIndex = currentIndex <= 0 ? userTracks.length - 1 : currentIndex - 1;
      playTrack(userTracks[prevIndex]);
      return;
    }

    if (playlistTracks.length > 0) {
      const currentIndex = playlistTracks.findIndex((p) => p.id === currentTrack?.id);
      const prevIndex = currentIndex <= 0 ? playlistTracks.length - 1 : currentIndex - 1;
      playTrack(playlistTracks[prevIndex]);
    }
  }, [currentTrack, userTracks, playlistTracks, playTrack]);

  // Handle Track Auto-Advance (Ended Event)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (repeatMode === "one" && currentTrack) {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else {
        nextTrack();
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [repeatMode, currentTrack, nextTrack]);

  const toggleShuffle = () => setIsShuffle((prev) => !prev);

  const cycleRepeatMode = () => {
    setRepeatMode((prev) => (prev === "off" ? "all" : prev === "all" ? "one" : "off"));
  };

  const cycleVisualizerTheme = () => {
    setVisualizerTheme((prev) => {
      const currentIdx = VISUALIZER_THEME_KEYS.indexOf(prev);
      const nextIdx = (currentIdx + 1) % VISUALIZER_THEME_KEYS.length;
      return VISUALIZER_THEME_KEYS[nextIdx];
    });
  };

  const setVolume = useCallback((v) => {
    setVolumeState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      const clamped = Math.max(0, Math.min(100, next));
      return clamped;
    });
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Global Keyboard Media Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName) ||
          activeEl.isContentEditable);

      if (isInput) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.altKey && e.code === "ArrowRight") {
        e.preventDefault();
        nextTrack();
      } else if (e.altKey && e.code === "ArrowLeft") {
        e.preventDefault();
        prevTrack();
      } else if (e.altKey && e.code === "ArrowUp") {
        e.preventDefault();
        setVolumeState((v) => Math.min(100, v + 5));
      } else if (e.altKey && e.code === "ArrowDown") {
        e.preventDefault();
        setVolumeState((v) => Math.max(0, v - 5));
      } else if (e.code === "KeyM" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleMute();
      } else if (e.code === "KeyF" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsFullscreenStage((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, nextTrack, prevTrack, toggleMute]);

  return (
    <MusicPlayerContext.Provider
      value={{
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
        officialRadio: OFFICIAL_RADIO,
        playlistTracks,
        isLoadingPlaylist,
        refreshPlaylist: fetchSupabaseTracks,
        userTracks,
        isImportingUserTracks,
        importUserFiles,
        removeUserTrack,
        radioMetadata,
        isFullscreenStage,
        setIsFullscreenStage,
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
        setVisualizerTheme,
        cycleVisualizerTheme,
        visualizerThemes: VISUALIZER_THEMES,
        eqPreset,
        setEqPreset,
        cycleEqPreset,
        currentEqPresetObj: EQ_PRESETS.find((p) => p.id === eqPreset) || EQ_PRESETS[0],
        eqPresets: EQ_PRESETS,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  }
  return ctx;
}
