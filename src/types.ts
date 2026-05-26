// ---------------------------------------------------------------------------
// Dependency types
// ---------------------------------------------------------------------------

/** A single reactive dependency value */
export type Dep = unknown;

/** A tuple of reactive dependency values */
export type Deps = readonly Dep[];

/** Snapshot of previous and current dependency values */
export type DepSnapshot<T extends Deps> = {
  prev: T;
  current: T;
};

// ---------------------------------------------------------------------------
// Async context passed to async callbacks
// ---------------------------------------------------------------------------

export type AsyncContext = {
  /** AbortSignal that fires when the phase is cancelled / stale */
  signal: AbortSignal;
};

// ---------------------------------------------------------------------------
// Callback signatures
// ---------------------------------------------------------------------------

export type MountCallback = () => void | (() => void);
export type UnmountCallback = () => void;

export type UpdateCallback<T extends Deps> =
  | ((ctx: AsyncContext) => Promise<unknown>)
  | ((ctx: AsyncContext) => unknown)
  | (() => Promise<unknown>)
  | (() => unknown);

// ---------------------------------------------------------------------------
// Matcher / mode
// ---------------------------------------------------------------------------

export type MatcherFn<T extends Deps> = (prev: T, current: T) => boolean;

export type ExecutionMode = "and" | "or";

// ---------------------------------------------------------------------------
// Async request state
// ---------------------------------------------------------------------------

export type RequestState = {
  loading: boolean;
  error: unknown | null;
  success: boolean;
};

// ---------------------------------------------------------------------------
// Phase controller — returned by onUpdate()
// ---------------------------------------------------------------------------

export interface PhaseController<T extends Deps> extends RequestState {
  /** Run only when ALL deps changed */
  and(): this;
  /** Run when ANY dep changed (default) */
  or(): this;
  /** Custom matcher — takes priority over and/or */
  when(fn: MatcherFn<T>): this;
  /** Delay execution until deps stop changing for `ms` milliseconds */
  debounce(ms: number): this;
  /** Execute at most once every `ms` milliseconds */
  throttle(ms: number): this;
  /** Retry failed async callbacks up to `count` times */
  retry(count: number): this;
  /** Handle errors from async callbacks */
  catch(handler: (error: unknown) => void): this;
}
