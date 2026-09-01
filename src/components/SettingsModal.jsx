import { useState, useEffect, useRef } from "react";
import {
  X,
  Mic,
  Volume2,
  Palette,
  User,
  Activity,
  Check,
  Play,
  Sparkles,
  ShieldCheck,
  Cpu,
  Radio,
} from "lucide-react";
import { supabase } from "../supabase";
import { useAppSettings } from "../AppSettingsContext";
import { useAppVersion } from "../version";

const THEMES = [
  {
    id: "obsidian",
    name: "Obsidian",
    desc: "Default sleek Obsidian aesthetic with electric indigo neon glow.",
    previewDots: ["#6366f1", "#121216", "#09090b"],
  },
  {
    id: "slate",
    name: "Graphite",
    desc: "Steel slate blue tones with sky cyan accents and charcoal cards.",
    previewDots: ["#38bdf8", "#14171d", "#0a0b0d"],
  },
  {
    id: "midnight",
    name: "Midnight",
    desc: "Deep cyber midnight indigo with radiant violet illumination.",
    previewDots: ["#818cf8", "#0f172a", "#060913"],
  },
  {
    id: "stealth",
    name: "Obsidian Stealth",
    desc: "Pure monochrome platinum & titanium stealth dark design.",
    previewDots: ["#e4e4e7", "#0f0f13", "#050507"],
  },
];

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  currentUsername = "",
  onUpdateProfile,
}) {
  const version = useAppVersion();
  const { settings, updateSetting } = useAppSettings();
  const [activeTab, setActiveTab] = useState("audio");

  // Audio devices list
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micTestVolume, setMicTestVolume] = useState(0);

  // Profile state
  const [username, setUsername] = useState(
    currentUsername || user?.user_metadata?.username || user?.email?.split("@")[0] || "Operator"
  );
  const [prevPropUsername, setPrevPropUsername] = useState(currentUsername);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState("");

  if (currentUsername && currentUsername !== prevPropUsername) {
    setPrevPropUsername(currentUsername);
    setUsername(currentUsername);
  }

  const micStreamRef = useRef(null);
  const micAudioCtxRef = useRef(null);
  const micAnimRef = useRef(null);

  // Fetch audio devices
  useEffect(() => {
    if (!isOpen) return;

    const loadDevices = async () => {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devs = await navigator.mediaDevices.enumerateDevices();
          const inputs = devs.filter((d) => d.kind === "audioinput");
          const outputs = devs.filter((d) => d.kind === "audiooutput");
          setInputDevices(inputs);
          setOutputDevices(outputs);
          if (inputs.length > 0 && !settings.selectedInput) {
            updateSetting("selectedInput", inputs[0].deviceId);
          }
          if (outputs.length > 0 && !settings.selectedOutput) {
            updateSetting("selectedOutput", outputs[0].deviceId);
          }
        }
      } catch (err) {
        console.error("Device error:", err);
      }
    };

    loadDevices();
  }, [isOpen, settings.selectedInput, settings.selectedOutput, updateSetting]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Mic test logic
  const toggleMicTest = async () => {
    if (isMicTesting) {
      stopMicTest();
    } else {
      startMicTest();
    }
  };

  const startMicTest = async () => {
    try {
      setIsMicTesting(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: settings.selectedInput ? { deviceId: { exact: settings.selectedInput } } : true,
      });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      micAudioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const sample = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setMicTestVolume(Math.min(100, Math.round((avg / 60) * 100)));
        micAnimRef.current = requestAnimationFrame(sample);
      };

      sample();
    } catch (err) {
      console.error("Mic test error:", err);
      setIsMicTesting(false);
    }
  };

  const stopMicTest = () => {
    if (micAnimRef.current) cancelAnimationFrame(micAnimRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micAudioCtxRef.current && micAudioCtxRef.current.state !== "closed") {
      micAudioCtxRef.current.close().catch(() => { });
      micAudioCtxRef.current = null;
    }
    setIsMicTesting(false);
    setMicTestVolume(0);
  };

  // Play test sound chime
  const playTestChime = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      const masterVol = (settings.masterVolume || 100) / 100;
      gain.gain.setValueAtTime(0.3 * masterVol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (err) {
      console.error("Chime error:", err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!username.trim() || !user) return;

    setIsSavingProfile(true);
    setProfileSavedMsg("");

    try {
      // 1. Update user metadata in Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({
        data: { username: username.trim() },
      });
      if (authErr) throw authErr;

      // 2. Update public profile record in database
      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            username: username.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      if (dbErr) throw dbErr;

      // 3. Save to localStorage
      try {
        localStorage.setItem("aighto_profile_username", username.trim());
      } catch (storageErr) {
        console.warn("Could not cache username to local storage:", storageErr);
      }

      if (onUpdateProfile) {
        onUpdateProfile(username.trim());
      }

      setProfileSavedMsg("Profile updated successfully");
      setTimeout(() => setProfileSavedMsg(""), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setProfileSavedMsg(`Error: ${err.message || "Failed to save profile"}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={() => {
        stopMicTest();
        onClose();
      }}
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 md:p-4 select-none animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90dvh] bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col md:flex-row min-h-0 md:min-h-[480px] cursor-default"
      >
        {/* Left Navigation Column / Mobile Tab Bar */}
        <div className="w-full md:w-56 bg-[var(--bg-sidebar)] p-2.5 md:p-4 border-b md:border-b-0 md:border-r border-[var(--border-card)] flex flex-row md:flex-col justify-between shrink-0 overflow-x-auto">
          <div className="flex flex-row md:flex-col gap-1 w-full">
            <div className="hidden md:block px-3 py-2 mb-2">
              <h2 className="text-xs font-bold tracking-tight text-white uppercase">
                Settings
              </h2>
            </div>

            <button
              onClick={() => {
                stopMicTest();
                setActiveTab("audio");
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${activeTab === "audio"
                  ? "bg-[var(--accent-muted)] text-white font-medium border border-[var(--accent-border)] shadow-sm"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
            >
              <Mic className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              Voice & Audio
            </button>

            <button
              onClick={() => {
                stopMicTest();
                setActiveTab("appearance");
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${activeTab === "appearance"
                  ? "bg-[var(--accent-muted)] text-white font-medium border border-[var(--accent-border)] shadow-sm"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
            >
              <Palette className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              Appearance
            </button>

            <button
              onClick={() => {
                stopMicTest();
                setActiveTab("account");
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${activeTab === "account"
                  ? "bg-[var(--accent-muted)] text-white font-medium border border-[var(--accent-border)] shadow-sm"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
            >
              <User className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              Profile & Account
            </button>

            <button
              onClick={() => {
                stopMicTest();
                setActiveTab("telemetry");
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${activeTab === "telemetry"
                  ? "bg-[var(--accent-muted)] text-white font-medium border border-[var(--accent-border)] shadow-sm"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
            >
              <Activity className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              Diagnostics
            </button>
          </div>

          {/* Footer Branding */}
          <div className="hidden md:flex px-2 py-2 border-t border-[var(--border-card)] items-center gap-2 text-[10px] font-mono text-zinc-500">
            <Sparkles className="w-3 h-3 text-[var(--accent-color)]" />
            <span>Aighto v{version}</span>
          </div>
        </div>

        {/* Right Content View */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col bg-[var(--bg-card)] relative touch-momentum">
          {/* Close Button */}
          <button
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 1. Voice & Audio Tab */}
          {activeTab === "audio" && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <Mic className="w-4 h-4 text-[var(--accent-color)]" /> Voice & Audio Hardware
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure your primary communication devices and input levels.
                </p>
              </div>

              {/* Input Device */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-300">
                  Input Microphone
                </label>
                <select
                  value={settings.selectedInput}
                  onChange={(e) => updateSetting("selectedInput", e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl text-xs text-zinc-100 outline-none focus:border-[var(--accent-color)] transition cursor-pointer"
                >
                  {inputDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId} className="bg-[var(--bg-card)]">
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Output Device */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-300">
                  Output Speaker / Headphones
                </label>
                <select
                  value={settings.selectedOutput}
                  onChange={(e) => updateSetting("selectedOutput", e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl text-xs text-zinc-100 outline-none focus:border-[var(--accent-color)] transition cursor-pointer"
                >
                  {outputDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId} className="bg-[var(--bg-card)]">
                      {d.label || `Speaker ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Master Volume Slider */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-200">
                  <span className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                    Master Stage Volume
                  </span>
                  <span className="font-bold text-white">{settings.masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.masterVolume}
                  onChange={(e) => updateSetting("masterVolume", Number(e.target.value))}
                  className="w-full accent-[var(--accent-color)] cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                />
              </div>

              {/* Live Mic Test Box */}
              <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-200">Microphone Input Level</span>
                  <button
                    onClick={toggleMicTest}
                    className={`px-3 py-1 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 ${isMicTesting
                        ? "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                      }`}
                  >
                    {isMicTesting ? "Stop Test" : "Test Mic"}
                  </button>
                </div>

                {/* Meter Bar */}
                <div className="w-full h-3 rounded-full bg-zinc-900 border border-white/10 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent-color)] to-emerald-400 transition-all duration-75"
                    style={{ width: `${micTestVolume}%` }}
                  />
                </div>
              </div>

              {/* Output Sound Test */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Speaker Test Sound</p>
                  <p className="text-[10px] text-zinc-400">Play a test chime to verify output volume</p>
                </div>
                <button
                  onClick={playTestChime}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-[var(--accent-color)]" />
                  Play Chime
                </button>
              </div>
            </div>
          )}

          {/* 2. Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[var(--accent-color)]" /> Appearance & Themes
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Customize the desktop application theme in real-time.
                </p>
              </div>

              {/* Theme Selector Grid */}
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((theme) => {
                  const isSelected = (settings.accentTheme || "obsidian") === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => updateSetting("accentTheme", theme.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 select-none ${isSelected
                          ? "bg-[var(--accent-muted)] border-[var(--accent-color)] shadow-lg shadow-black/40 ring-1 ring-[var(--accent-color)]"
                          : "bg-[var(--bg-main)] hover:bg-[var(--bg-sidebar)] border-[var(--border-subtle)]"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white tracking-tight">
                          {theme.name}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-[var(--accent-color)] text-[var(--accent-text)] flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-zinc-400 line-clamp-2">
                        {theme.desc}
                      </p>

                      {/* Theme Palette Dots Preview */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {theme.previewDots.map((dot, idx) => (
                          <span
                            key={idx}
                            className="w-3 h-3 rounded-full border border-black/40 shadow-xs"
                            style={{ backgroundColor: dot }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Discord Rich Presence Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)]">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">
                    Discord Rich Presence (RPC)
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Display your active background music and station in your Discord profile status.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting("discordRPC", !settings.discordRPC)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ml-3 ${settings.discordRPC ? "bg-[var(--accent-color)]" : "bg-zinc-800 border border-white/10"
                    }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.discordRPC ? "translate-x-5" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* 3. Account Tab */}
          {activeTab === "account" && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--accent-color)]" /> Account Profile
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage your encrypted operator identity.
                </p>
              </div>

              {/* Avatar Preview */}
              <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)] flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-lg font-mono font-bold text-[var(--accent-color)] shadow-xl">
                  {username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{username}</p>
                  <p className="text-xs text-zinc-400">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 mt-1">
                    <ShieldCheck className="w-3 h-3" /> Supabase Session Active
                  </span>
                </div>
              </div>

              {/* Username Edit Form */}
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-300">
                    Display Handle
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-xl text-xs text-zinc-100 outline-none focus:border-[var(--accent-color)] transition"
                  />
                </div>

                {profileSavedMsg && (
                  <p
                    className={`text-xs font-mono flex items-center gap-1.5 ${profileSavedMsg.startsWith("Error") || profileSavedMsg.startsWith("Failed")
                        ? "text-rose-400"
                        : "text-emerald-400"
                      }`}
                  >
                    {!profileSavedMsg.startsWith("Error") && !profileSavedMsg.startsWith("Failed") && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    {profileSavedMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] rounded-xl text-xs font-semibold transition cursor-pointer shadow-md shadow-black/40"
                >
                  {isSavingProfile ? "Saving..." : "Update Handle"}
                </button>
              </form>
            </div>
          )}

          {/* 4. Diagnostics Tab */}
          {activeTab === "telemetry" && (
            <div className="space-y-5 animate-in fade-in duration-100">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--accent-color)]" /> Network Diagnostics
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Live mesh telemetry and runtime node status.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <Radio className="w-3.5 h-3.5 text-[var(--accent-color)]" /> WebRTC Mesh
                  </div>
                  <p className="text-base font-bold text-white font-mono">LiveKit HD</p>
                  <p className="text-[10px] font-mono text-emerald-400">0ms WebAudio Latency</p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <Cpu className="w-3.5 h-3.5 text-[var(--accent-color)]" /> Supabase Realtime
                  </div>
                  <p className="text-base font-bold text-white font-mono">Postgres Sub</p>
                  <p className="text-[10px] font-mono text-emerald-400">Connected</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0d0d11] border border-white/10 space-y-2">
                <p className="text-xs font-semibold text-zinc-200">Runtime Specification</p>
                <div className="text-[11px] font-mono text-zinc-400 space-y-1">
                  <p>• Client: Aighto Desktop v{version}</p>
                  <p>• Framework: Tauri v2 (Rust Backend)</p>
                  <p>• Audio Mesh: WebRTC LiveKit Node</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
