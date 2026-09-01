import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import pkg from "../package.json";

export const APP_VERSION = pkg.version || "0.1.0";

/**
 * React hook to get the active app version from Tauri runtime or package.json
 */
export function useAppVersion() {
  const [version, setVersion] = useState(APP_VERSION);

  useEffect(() => {
    let isMounted = true;
    getVersion()
      .then((ver) => {
        if (isMounted && ver) {
          setVersion(ver);
        }
      })
      .catch(() => {
        // Fallback to package.json version
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return version;
}
