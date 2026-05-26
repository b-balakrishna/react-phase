import { useEffect, useRef, useState } from "react";
import type {
  Deps,
  UpdateCallback,
  PhaseController,
  MatcherFn,
  ExecutionMode,
  RequestState,
} from "./types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function depsChanged(prev: Deps, current: Deps): boolean {
  if (prev.length !== current.length) return true;
  return prev.some((p, i) => !Object.is(p, current[i]));
}

function allDepsChanged(prev: Deps, current: Deps): boolean {
  if (prev.length !== current.length) return true;
  return prev.every((p, i) => !Object.is(p, current[i]));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry(
  fn: () => Promise<unknown>,
  retries: number,
  signal: AbortSignal
): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await fn();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      lastError = err;
      if (attempt < retries) await sleep(Math.pow(2, attempt) * 100);
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Controller implementation
// ---------------------------------------------------------------------------

class PhaseControllerImpl<T extends Deps> implements PhaseController<T> {
  // --- public request state ---
  loading = false;
  error: unknown | null = null;
  success = false;

  // --- configuration ---
  private _mode: ExecutionMode = "or";
  private _matcher: MatcherFn<T> | null = null;
  private _debounceMs: number | null = null;
  private _throttleMs: number | null = null;
  private _retryCount = 0;
  private _catchHandler: ((error: unknown) => void) | null = null;

  // --- fluent setters ---
  and(): this {
    this._mode = "and";
    return this;
  }

  or(): this {
    this._mode = "or";
    return this;
  }

  when(fn: MatcherFn<T>): this {
    this._matcher = fn;
    return this;
  }

  debounce(ms: number): this {
    this._debounceMs = ms;
    return this;
  }

  throttle(ms: number): this {
    this._throttleMs = ms;
    return this;
  }

  retry(count: number): this {
    this._retryCount = count;
    return this;
  }

  catch(handler: (error: unknown) => void): this {
    this._catchHandler = handler;
    return this;
  }

  // --- read-only accessors for the hook ---
  get mode(): ExecutionMode {
    return this._mode;
  }
  get matcher(): MatcherFn<T> | null {
    return this._matcher;
  }
  get debounceMs(): number | null {
    return this._debounceMs;
  }
  get throttleMs(): number | null {
    return this._throttleMs;
  }
  get retryCount(): number {
    return this._retryCount;
  }
  get catchHandler(): ((error: unknown) => void) | null {
    return this._catchHandler;
  }
}

// ---------------------------------------------------------------------------
// useUpdate
// ---------------------------------------------------------------------------

/**
 * Returns an `onUpdate` function that accepts dependency arrays and callbacks,
 * and returns a chainable PhaseController.
 */
export function useUpdate(): <T extends Deps>(
  deps: T,
  callback: UpdateCallback<T>
) => PhaseController<T> {
  // We keep a list of all registered phases for this hook instance
  const phasesRef = useRef<
    Array<{
      deps: Deps;
      callback: UpdateCallback<Deps>;
      controller: PhaseControllerImpl<Deps>;
    }>
  >([]);

  // Reset phase list each render so registrations are fresh
  phasesRef.current = [];

  // Abort controller for the current round of async executions
  const abortRef = useRef<AbortController | null>(null);

  // Throttle tracking: last execution time per phase index
  const lastThrottleRef = useRef<Map<number, number>>(new Map());

  // Debounce timer tracking per phase index
  const debounceTimerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Previous deps per phase index
  const prevDepsRef = useRef<Map<number, Deps>>(new Map());

  // Force re-render when async state changes
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const phases = phasesRef.current;

    // Abort previous async operations
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    let executionId = 0; // stale-execution guard

    phases.forEach((phase, index) => {
      const { deps, callback, controller } = phase;
      const prevDeps = prevDepsRef.current.get(index);

      // First render — just record deps, don't run
      if (prevDeps === undefined) {
        prevDepsRef.current.set(index, deps);
        return;
      }

      // Determine whether to run
      let shouldRun: boolean;

      if (controller.matcher !== null) {
        shouldRun = controller.matcher(prevDeps as Deps, deps);
      } else if (controller.mode === "and") {
        shouldRun = allDepsChanged(prevDeps, deps);
      } else {
        shouldRun = depsChanged(prevDeps, deps);
      }

      prevDepsRef.current.set(index, deps);

      if (!shouldRun) return;

      // Throttle
      if (controller.throttleMs !== null) {
        const lastRun = lastThrottleRef.current.get(index) ?? 0;
        const now = Date.now();
        if (now - lastRun < controller.throttleMs) return;
        lastThrottleRef.current.set(index, now);
      }

      const executePhase = () => {
        if (ac.signal.aborted) return;

        const myId = ++executionId;

        const rawResult = (callback as (ctx: { signal: AbortSignal }) => unknown)({
          signal: ac.signal,
        });

        if (rawResult instanceof Promise) {
          controller.loading = true;
          controller.error = null;
          controller.success = false;
          forceUpdate((n) => n + 1);

          runWithRetry(
            () => rawResult,
            controller.retryCount,
            ac.signal
          )
            .then(() => {
              if (myId !== executionId || ac.signal.aborted) return;
              controller.loading = false;
              controller.success = true;
              forceUpdate((n) => n + 1);
            })
            .catch((err: unknown) => {
              if (myId !== executionId || ac.signal.aborted) return;
              if (err instanceof DOMException && err.name === "AbortError") return;
              controller.loading = false;
              controller.error = err;
              controller.success = false;
              controller.catchHandler?.(err);
              forceUpdate((n) => n + 1);
            });
        }
      };

      // Debounce
      if (controller.debounceMs !== null) {
        const existing = debounceTimerRef.current.get(index);
        if (existing !== undefined) clearTimeout(existing);
        const timer = setTimeout(executePhase, controller.debounceMs);
        debounceTimerRef.current.set(index, timer);
      } else {
        executePhase();
      }
    });

    return () => {
      ac.abort();
      debounceTimerRef.current.forEach((timer) => clearTimeout(timer));
    };
  });

  return <T extends Deps>(
    deps: T,
    callback: UpdateCallback<T>
  ): PhaseController<T> => {
    const controller = new PhaseControllerImpl<T>();
    phasesRef.current.push({
      deps,
      callback: callback as UpdateCallback<Deps>,
      controller: controller as unknown as PhaseControllerImpl<Deps>,
    });
    return controller;
  };
}
