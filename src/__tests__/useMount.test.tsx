import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMount } from '../useMount';

describe('useMount', () => {
  it('calls the mount callback exactly once on mount', () => {
    const callback = vi.fn();

    renderHook(() => {
      const onMount = useMount();
      onMount(callback);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not re-execute the mount callback on re-renders', () => {
    const callback = vi.fn();

    const { rerender } = renderHook(() => {
      const onMount = useMount();
      onMount(callback);
    });

    // Initial mount call
    expect(callback).toHaveBeenCalledTimes(1);

    // Re-render multiple times
    rerender();
    rerender();
    rerender();

    // Still only called once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('calls the cleanup function returned from callback on unmount', () => {
    const cleanup = vi.fn();
    const callback = vi.fn(() => cleanup);

    const { unmount } = renderHook(() => {
      const onMount = useMount();
      onMount(callback);
    });

    expect(cleanup).not.toHaveBeenCalled();

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
