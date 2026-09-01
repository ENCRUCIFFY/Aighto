import { useAppSettings } from "../AppSettingsContext";

const THEME_LOGOS = {
  obsidian: "/logos/logo_obsidian.png",
  slate: "/logos/logo_slate.png",
  midnight: "/logos/logo_midnight.png",
  stealth: "/logos/logo_stealth.png",
  original: "/logos/logo_original.png",
};

export default function AightoLogo({
  className = "w-6 h-6",
  theme: explicitTheme,
  glow = true,
}) {
  const { settings } = useAppSettings();
  const currentTheme = explicitTheme || settings?.accentTheme || "obsidian";
  const logoSrc = THEME_LOGOS[currentTheme] || THEME_LOGOS.obsidian;

  return (
    <img
      src={logoSrc}
      alt="Aighto Logo"
      className={`object-contain select-none shrink-0 ${glow ? "drop-shadow-[0_2px_8px_rgba(255,255,255,0.12)]" : ""} ${className}`}
      draggable={false}
    />
  );
}
