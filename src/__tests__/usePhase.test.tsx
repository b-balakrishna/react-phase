import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePhase } from '../usePhase';

describe('usePhase', () => {
  it('returns an object with onMount, onUnmount, and onUpdate functions', () => {
    const { result } = renderHook(() => usePhase());

    expect(result.current).toHaveProperty('onMount');
    expect(result.current).toHaveProperty('onUnmount');
    expect(result.current).toHaveProperty('onUpdate');
    expect(typeof result.current.onMount).toBe('function');
    expect(typeof result.current.onUnmount).toBe('function');
    expect(typeof result.current.onUpdate).toBe('function');
  });

  it('mount behavior: callback called exactly once on mount', () => {
    const callback = vi.fn();

    const { rerender } = renderHook(() => {
      const { onMount } = usePhase();
      onMount(callback);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    rerender();
    rerender();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('unmount behavior: callback called on unmount', () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => {
      const { onUnmount } = usePhase();
      onUnmount(callback);
    });

    expect(callback).not.toHaveBeenCalled();

    unmount();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('update behavior: callback fires on dependency change', () => {
    const callback = vi.fn();

    const { rerender } = renderHook(
      ({ dep }) => {
        const { onUpdate } = usePhase();
        onUpdate([dep], callback);
      },
      { initialProps: { dep: 1 } }
    );

    // First render records deps, does not fire
    expect(callback).not.toHaveBeenCalled();

    // Change dep → callback fires
    rerender({ dep: 2 });
    expect(callback).toHaveBeenCalledTimes(1);

    // Change dep again → callback fires again
    rerender({ dep: 3 });
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
