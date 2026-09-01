# Aighto Development Rules & Architecture

## Tech Stack & Integrations
- **Frontend**: React (Vite), Tailwind CSS, Lucide React
- **Desktop Layer**: Tauri v2 (Rust backend)
  - Native OS dark window decorations (`"decorations": true`, `"theme": "Dark"`)
  - Single-instance lock via `tauri-plugin-single-instance` to prevent duplicate windows
- **Data & Realtime**: Supabase
  - Auth, PostgreSQL realtime changes for message sync
  - Supabase Realtime Broadcast channels for instant cross-client reactions and presence
- **Audio/Video Mesh**: LiveKit (`@livekit/components-react`)
  - **Security Rule**: Always use `jose` for client-side LiveKit tokens in `src/livekit.js` (never Node `jsonwebtoken` or server SDKs in Vite)
- **Audio Engine**: 0ms Web Audio API (`AudioContext` & `AnalyserNode`, `fftSize = 64`) with strict per-participant track isolation and instant mute reset

---

## Design System & Theme Conventions
- **Obsidian Bento Theme**:
  - Base background: `#0a0712`
  - Card containers: `#130d22` (hover: `#18102b`)
  - Feed canvas: `#0f0a1a`
  - Glassmorphic borders: `border-purple-500/15` to `border-purple-500/25`
  - Floating boundaries: `rounded-2xl` and `rounded-3xl` with `shadow-purple-950/80`
- **Dynamic Theme Presets** (`AppSettingsContext`):
  - `Electric Fuchsia`: Signature neon pink/fuchsia glow
  - `Cyber Violet`: Deep indigo/violet cyber glow
  - `Obsidian Stealth`: Minimalist monochrome silver/zinc dark aesthetic
- **Reduced Motion Support**:
  - `html.reduced-motion` automatically disables all continuous equalizer animations and pulsing rings for accessibility and power saving.

---

## Component Architecture Overview
- `src/App.jsx`: Top-level workspace layout, realtime channel/reaction subscriptions, LiveKit room context.
- `src/AppSettingsContext.jsx`: Persistent global settings (theme, reduced motion, audio devices, master volume).
- `src/components/Sidebar.jsx`: Collapsible navigation (256px full vs 76px slim rail), logo toggle, clean magnifying glass search, and bottom-left user bento launcher.
- `src/components/ProfilePopover.jsx`: Floating user profile popover with settings trigger and sign-out.
- `src/components/SettingsModal.jsx`: Bento tabbed preferences (Voice/Audio hardware & live mic test meter, Appearance themes & reduced motion, Account handle editor, Diagnostics).
- `src/components/ChatFeed.jsx`: Realtime text feed, drag-and-drop image uploads, and server-synced emoji reactions.
- `src/components/MessageContent.jsx`: Markdown parser with syntax code blocks (1-click Copy button), spoilers (`||spoiler||`), inline code, and image cards.
- `src/components/ImageLightbox.jsx`: Fullscreen click-to-expand image modal with download and new-tab actions.
- `src/components/BentoAudioDock.jsx`: Floating audio dock with dynamic volume scale and active speaker rings.
- `src/VoiceRoom.jsx`: WebRTC stage grid, screen-sharing, spotlighting, and right-click participant volume controls.
- `src/components/CommandPalette.jsx`: `Ctrl+K` fuzzy search across text channels and audio meshes.

---

## Workflow & Planning Rule
- **Mandatory Approval Pause**: Always generate or update the `implementation_plan.md` artifact first and **pause to wait for explicit user approval** before writing or modifying source files and executing modification commands.