import { useEffect, useRef } from "react";
import type { MountCallback } from "./types";

/**
 * Returns an `onMount` function that runs a callback once after the component mounts.
 * Supports optional cleanup via the callback's return value.
 */
export function useMount(): (callback: MountCallback) => void {
  const callbackRef = useRef<MountCallback | null>(null);
  const registered = useRef(false);

  useEffect(() => {
    if (!registered.current || callbackRef.current === null) return;
    const cleanup = callbackRef.current();
    return typeof cleanup === "function" ? cleanup : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (callback: MountCallback) => {
    callbackRef.current = callback;
    registered.current = true;
  };
}
