import type { MountCallback, UnmountCallback, Deps, UpdateCallback, PhaseController } from "./types";
import { useMount } from "./useMount";
import { useUnmount } from "./useUnmount";
import { useUpdate } from "./useUpdate";

export type UsePhaseReturn = {
  onMount: (callback: MountCallback) => void;
  onUnmount: (callback: UnmountCallback) => void;
  onUpdate: <T extends Deps>(deps: T, callback: UpdateCallback<T>) => PhaseController<T>;
};

/**
 * Unified hook that exposes all three lifecycle phases:
 * `onMount`, `onUnmount`, and `onUpdate`.
 */
export function usePhase(): UsePhaseReturn {
  const onMount = useMount();
  const onUnmount = useUnmount();
  const onUpdate = useUpdate();

  return { onMount, onUnmount, onUpdate };
}
