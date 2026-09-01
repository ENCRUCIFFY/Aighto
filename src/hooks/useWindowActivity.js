import { useState, useEffect } from "react";

/**
 * Hook to track whether the window is currently active/visible.
 * Allows components to pause heavy animation frames, Web Audio analyzers,
 * and background timers when the window is minimized or in the background.
 */
export function useWindowActivity() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
  });

  const [isFocused, setIsFocused] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.hasFocus ? document.hasFocus() : true;
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState !== "hidden");
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Window is considered active if it is visible on screen
  return {
    isActive: isVisible,
    isVisible,
    isFocused,
  };
}
