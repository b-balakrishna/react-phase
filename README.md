# react-phase

A phase-first lifecycle abstraction for React.

`react-phase` helps you manage component lifecycle logic without directly depending on `useEffect`. Instead of scattering side effects across multiple effects, `react-phase` provides structured lifecycle phases with readable and controllable update execution — fully typed with TypeScript.

---

## Why?

Managing side effects in React often becomes difficult because:

- `useEffect` mixes multiple concerns
- dependency arrays become hard to reason about
- lifecycle intent is unclear
- update conditions are limited to OR behavior
- async effects become messy
- complex effects become unreadable

`react-phase` provides:

- explicit lifecycle phases
- mount / unmount / update separation
- AND / OR dependency execution
- custom dependency matchers via `.when()`
- debounce & throttle support
- async phase orchestration
- request cancellation via `AbortSignal`
- retry handling
- full TypeScript support

---

## Installation

    npm install react-phase

    pnpm add react-phase

    yarn add react-phase

---

## Quick Example

    import { usePhase } from "react-phase";

    function App({ user, token, search }: Props) {
      const { onMount, onUnmount, onUpdate } = usePhase();

      onMount(() => {
        console.log("mounted");
      });

      onUnmount(() => {
        console.log("cleanup");
      });

      onUpdate([user, token] as const, () => {
        console.log("both changed");
      }).and();

      onUpdate([search] as const, () => {
        console.log("searching...");
      }).debounce(500);

      return <div>Hello</div>;
    }

---

## Core Concepts

`react-phase` organizes component side effects into explicit lifecycle phases.

| Phase       | Purpose                       |
|-------------|-------------------------------|
| `onMount`   | Runs once after mount         |
| `onUnmount` | Runs once before unmount      |
| `onUpdate`  | Runs when dependencies change |

---

## Lifecycle Phases

### `onMount`

Runs once after component mount. Supports optional cleanup via return value.

    onMount(() => {
      const timer = setInterval(tick, 1000);
      return () => clearInterval(timer); // cleanup
    });

### `onUnmount`

Runs once before component unmount.

    onUnmount(() => {
      console.log("cleanup");
    });

### `onUpdate`

Runs when dependencies change. Returns a chainable `PhaseController`.

    onUpdate([count] as const, () => {
      console.log("count changed");
    });

---

## Dependency Execution Modes

### Default — OR Mode

By default, updates run when **any** dependency changes.

    onUpdate([user, token] as const, () => {
      console.log("either changed");
    });

    // equivalent to:
    onUpdate([user, token] as const, () => {
      console.log("either changed");
    }).or();

### AND Mode

Run only when **all** dependencies change.

    onUpdate([user, token] as const, () => {
      console.log("both changed");
    }).and();

---

## Custom Matchers — `.when()`

Create fully custom dependency execution logic using `.when()`.

`.when()` takes priority over `.and()` and `.or()`.

    onUpdate([price] as const, () => {
      console.log("threshold crossed");
    }).when((prev, current) => {
      return prev[0] < 1000 && current[0] >= 1000;
    });

**Authentication example:**

    onUpdate([user, token] as const, () => {
      console.log("authenticated");
    }).when((prev, current) => {
      const [prevUser, prevToken] = prev;
      const [currentUser, currentToken] = current;
      return !prevUser && !prevToken && !!currentUser && !!currentToken;
    });

The matcher receives strongly-typed `prev` and `current` arrays matching the shape of the deps tuple.

---

## Debounce Updates

Delay execution until dependency changes stop for a specified duration.

Useful for: search inputs, API calls, expensive computations, resize handlers.

    onUpdate([search] as const, () => {
      fetchResults(search);
    }).debounce(500);

The update runs only after 500ms of inactivity.

---

## Throttle Updates

Limit how frequently updates can execute.

Useful for: scroll events, mouse movement, rapid state updates, performance-sensitive operations.

    onUpdate([scrollY] as const, () => {
      console.log(scrollY);
    }).throttle(200);

The update runs at most once every 200ms.

---

## Async Phase Orchestration

`react-phase` supports async lifecycle execution with built-in orchestration helpers.

### Async Updates

    onUpdate([userId] as const, async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      setUser(data);
    });

### Automatic Stale Execution Protection

When dependencies change rapidly, older async executions are automatically ignored — only the latest execution is applied.

### Abort Support

Async phases receive an `AbortSignal`. When the component unmounts, dependencies change, or execution becomes stale, the previous request is aborted automatically.

    onUpdate([userId] as const, async ({ signal }) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      const data = await response.json();
      setUser(data);
    });

### Retry Support

Retries failed executions up to N times with exponential backoff.

    onUpdate([userId] as const, async () => {
      return fetchUser(userId);
    }).retry(3);

### Error Handling

    onUpdate([userId] as const, async () => {
      return fetchUser(userId);
    }).catch((error) => {
      console.error(error);
    });

### Async State

The controller exposes reactive loading/error/success state.

    const request = onUpdate([userId] as const, async () => {
      return fetchUser(userId);
    });

    console.log(request.loading);
    console.log(request.error);
    console.log(request.success);

---

## Combined Example

    import { usePhase } from "react-phase";

    function Dashboard({ user, token, search, scrollY, price }: Props) {
      const { onMount, onUnmount, onUpdate } = usePhase();

      onMount(() => {
        console.log("Dashboard mounted");
      });

      onUnmount(() => {
        console.log("Dashboard cleanup");
      });

      onUpdate([user, token] as const, () => {
        console.log("Both changed");
      }).and();

      onUpdate([search] as const, async ({ signal }) => {
        const response = await fetch(`/api/search?q=${search}`, { signal });
        return response.json();
      })
        .debounce(400)
        .retry(2)
        .catch(console.error);

      onUpdate([scrollY] as const, () => {
        console.log("Tracking scroll...");
      }).throttle(100);

      onUpdate([price] as const, () => {
        console.log("Threshold crossed");
      }).when((prev, current) => {
        return prev[0] < 1000 && current[0] >= 1000;
      });

      return <div>Dashboard</div>;
    }

---

## Individual Hooks

### `useMount`

    import { useMount } from "react-phase";

    function App() {
      const onMount = useMount();

      onMount(() => {
        console.log("mounted");
      });

      return <div>Hello</div>;
    }

### `useUnmount`

    import { useUnmount } from "react-phase";

    function App() {
      const onUnmount = useUnmount();

      onUnmount(() => {
        console.log("cleanup");
      });

      return <div>Hello</div>;
    }

### `useUpdate`

    import { useUpdate } from "react-phase";

    function App() {
      const onUpdate = useUpdate();

      onUpdate([count] as const, () => {
        console.log("updated");
      });

      return <div>Hello</div>;
    }

---

## Fluent API

`onUpdate()` returns a chainable phase controller.

| Method            | Description                        |
|-------------------|------------------------------------|
| `.and()`          | Run when ALL dependencies change   |
| `.or()`           | Run when ANY dependency changes    |
| `.when(fn)`       | Custom dependency matcher          |
| `.debounce(ms)`   | Delay execution                    |
| `.throttle(ms)`   | Limit execution frequency          |
| `.retry(count)`   | Retry failed async phases          |
| `.catch(handler)` | Handle async errors                |

---

## API

### `usePhase`

    const { onMount, onUnmount, onUpdate } = usePhase();

### `onMount(callback)`

Runs once after mount. Return a function for cleanup.

### `onUnmount(callback)`

Runs once before unmount.

### `onUpdate(deps, callback)`

Returns a chainable `PhaseController<T>`.

### `PhaseController<T>`

    interface PhaseController<T extends Deps> {
      loading: boolean;
      error: unknown | null;
      success: boolean;

      and(): this;
      or(): this;
      when(fn: MatcherFn<T>): this;
      debounce(ms: number): this;
      throttle(ms: number): this;
      retry(count: number): this;
      catch(handler: (error: unknown) => void): this;
    }

---

## Design Philosophy

`react-phase` is designed to:

- embrace React
- reduce `useEffect` complexity
- improve readability
- provide smarter dependency handling
- simplify async effects
- remain lightweight and predictable

This library does not replace React internally. It provides a cleaner lifecycle abstraction layer on top of React's lifecycle system.

---

## Roadmap

### v1

- [x] mount phase
- [x] unmount phase
- [x] update phase
- [x] AND dependency execution
- [x] OR dependency execution
- [x] custom dependency matchers via `.when()`
- [x] debounce support
- [x] throttle support
- [x] async orchestration
- [x] retry handling with exponential backoff
- [x] request cancellation via AbortSignal
- [x] full TypeScript support

### Future Ideas

- lifecycle devtools
- transition scheduling
- update batching
- execution tracing
- previous dependency snapshots
- custom schedulers
- middleware system
- plugin ecosystem

---

## License

MIT
