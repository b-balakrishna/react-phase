# react-phase

A phase-first lifecycle abstraction for React.

`react-phase` helps you manage component lifecycle logic without directly depending on `useEffect`. Instead of scattering side effects across multiple effects, `react-phase` provides structured lifecycle phases with readable and controllable update execution.

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
- custom dependency matchers
- debounce & throttle support
- async phase orchestration
- request cancellation
- retry handling
- cleaner lifecycle orchestration

---

## Installation

    npm install react-phase

    pnpm add react-phase

    yarn add react-phase

---

## Quick Example

    import { usePhase } from "react-phase";

    function App({ user, token, search }) {
      const { onMount, onUnmount, onUpdate } = usePhase();

      onMount(() => {
        console.log("mounted");
      });

      onUnmount(() => {
        console.log("cleanup");
      });

      onUpdate([user, token], () => {
        console.log("both changed");
      }).and();

      onUpdate([search], () => {
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

Runs once after component mount.

    onMount(() => {
      console.log("mounted");
    });

### `onUnmount`

Runs once before component unmount.

    onUnmount(() => {
      console.log("cleanup");
    });

### `onUpdate`

Runs when dependencies change.

    onUpdate(dependencies, callback);

    onUpdate([count], () => {
      console.log("count changed");
    });

---

## Dependency Execution Modes

### Default — OR Mode

By default, updates run when **any** dependency changes.

    onUpdate([user, token], () => {
      console.log("either changed");
    });

    // equivalent to:
    onUpdate([user, token], () => {
      console.log("either changed");
    }).or();

### AND Mode

Run only when **all** dependencies change.

    onUpdate([user, token], () => {
      console.log("both changed");
    }).and();

---

## Smart Matchers

Create fully custom dependency execution logic using `.match()`.

Useful for:
- advanced update conditions
- threshold-based updates
- selective dependency matching
- business-rule-driven execution

    onUpdate(dependencies, callback)
      .match((prev, current) => boolean);

**Threshold example:**

    onUpdate([price], () => {
      console.log("threshold crossed");
    }).match((prev, current) => {
      return prev[0] < 1000 && current[0] >= 1000;
    });

**Authentication example:**

    onUpdate([user, token], () => {
      console.log("authenticated");
    }).match((prev, current) => {
      const [prevUser, prevToken] = prev;
      const [currentUser, currentToken] = current;

      return !prevUser && !prevToken && currentUser && currentToken;
    });

> **Match Priority**: When `.match()` is used, `.and()` and `.or()` are ignored — custom matching becomes the execution source of truth.

---

## Debounce Updates

Delay execution until dependency changes stop for a specified duration.

Useful for: search inputs, API calls, expensive computations, resize handlers.

    onUpdate([search], () => {
      fetchResults(search);
    }).debounce(500);

The update runs only after 500ms of inactivity.

---

## Throttle Updates

Limit how frequently updates can execute.

Useful for: scroll events, mouse movement, rapid state updates, performance-sensitive operations.

    onUpdate([scrollY], () => {
      console.log(scrollY);
    }).throttle(200);

The update runs at most once every 200ms.

---

## Async Phase Orchestration

`react-phase` supports async lifecycle execution with built-in orchestration helpers.

Useful for: API requests, async state synchronization, preventing race conditions, request cancellation, loading workflows.

### Async Updates

    onUpdate([userId], async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      setUser(data);
    });

### Automatic Stale Execution Protection

When dependencies change rapidly, older async executions are automatically ignored — only the latest execution is applied.

    onUpdate([search], async () => {
      const response = await searchApi(search);
      setResults(response);
    });

### Abort Support

Async phases receive an `AbortSignal`. When the component unmounts, dependencies change, or execution becomes stale, the previous request is aborted automatically.

    onUpdate([userId], async ({ signal }) => {
      const response = await fetch(`/api/users/${userId}`, { signal });
      const data = await response.json();
      setUser(data);
    });

### Retry Support

    onUpdate([userId], async () => {
      return fetchUser(userId);
    }).retry(3);

### Error Handling

    onUpdate([userId], async () => {
      return fetchUser(userId);
    }).catch((error) => {
      console.error(error);
    });

### Async State

    const request = onUpdate([userId], async () => {
      return fetchUser(userId);
    });

    console.log(request.loading);
    console.log(request.error);
    console.log(request.success);

---

## Combined Example

    import { usePhase } from "react-phase";

    function Dashboard({ user, token, search, scrollY, price }) {
      const { onMount, onUnmount, onUpdate } = usePhase();

      onMount(() => {
        console.log("Dashboard mounted");
      });

      onUnmount(() => {
        console.log("Dashboard cleanup");
      });

      onUpdate([user, token], () => {
        console.log("Both changed");
      }).and();

      onUpdate([search], async ({ signal }) => {
        const response = await fetch(`/api/search?q=${search}`, { signal });
        return response.json();
      })
        .debounce(400)
        .retry(2)
        .catch(console.error);

      onUpdate([scrollY], () => {
        console.log("Tracking scroll...");
      }).throttle(100);

      onUpdate([price], () => {
        console.log("Threshold crossed");
      }).match((prev, current) => {
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

      onUpdate([count], () => {
        console.log("updated");
      });

      return <div>Hello</div>;
    }

---

## Fluent API

`onUpdate()` returns a chainable phase controller.

| Method            | Description                      |
|-------------------|----------------------------------|
| `.and()`          | Run when ALL dependencies change |
| `.or()`           | Run when ANY dependency changes  |
| `.match(fn)`      | Custom dependency matcher        |
| `.debounce(ms)`   | Delay execution                  |
| `.throttle(ms)`   | Limit execution frequency        |
| `.retry(count)`   | Retry failed async phases        |
| `.catch(handler)` | Handle async errors              |

---

## API

### `usePhase`

    const { onMount, onUnmount, onUpdate } = usePhase();

### `onMount`

    onMount(callback);

Runs once after mount.

### `onUnmount`

    onUnmount(callback);

Runs once before unmount.

### `onUpdate`

    onUpdate(dependencies, callback);

Returns a chainable phase controller.

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

## Motivation

React provides powerful primitives, but lifecycle logic often becomes fragmented as applications grow.

`react-phase` aims to provide:

- clearer lifecycle readability
- structured update handling
- predictable execution semantics
- cleaner side effect orchestration
- safer async behavior
- better developer ergonomics

...without changing React's mental model.

---

## Roadmap

### v1

- [x] mount phase
- [x] unmount phase
- [x] update phase
- [x] AND dependency execution
- [x] OR dependency execution
- [x] custom dependency matchers
- [x] debounce support
- [x] throttle support
- [x] async orchestration
- [x] retry handling
- [x] request cancellation

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
