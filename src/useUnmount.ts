import { useEffect, useRef } from "react";
import type { UnmountCallback } from "./types";

/**
 * Returns an `onUnmount` function that runs a callback once before the component unmounts.
 */
export function useUnmount(): (callback: UnmountCallback) => void {
  const callbackRef = useRef<UnmountCallback | null>(null);

  useEffect(() => {
    return () => {
      callbackRef.current?.();
    };
  }, []);

  return (callback: UnmountCallback) => {
    callbackRef.current = callback;
  };
}
