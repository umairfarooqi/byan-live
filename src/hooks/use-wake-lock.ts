import { useEffect, useRef } from "react";

/**
 * Wake Lock API helper. Keeps the screen awake while active and re-requests the
 * lock whenever the tab becomes visible again (browsers release it on hide).
 *
 * NOTE: iOS Safari may still suspend audio playback when the tab is backgrounded
 * or the screen locks. That is a browser-level limitation with no full JS fix —
 * Media Session + Wake Lock only improve the odds, they cannot guarantee it.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let cancelled = false;

    const request = async () => {
      try {
        if (document.visibilityState !== "visible") return;
        lockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        /* denied or unsupported — safe to ignore */
      }
    };

    const onVisibility = () => {
      if (!cancelled && document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
