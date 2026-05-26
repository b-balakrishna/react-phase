import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnmount } from '../useUnmount';

describe('useUnmount', () => {
  it('calls the unmount callback exactly once on unmount', () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => {
      const onUnmount = useUnmount();
      onUnmount(callback);
    });

    expect(callback).not.toHaveBeenCalled();

    unmount();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not call the callback while the component is mounted (including re-renders)', () => {
    const callback = vi.fn();

    const { rerender } = renderHook(() => {
      const onUnmount = useUnmount();
      onUnmount(callback);
    });

    expect(callback).not.toHaveBeenCalled();

    rerender();
    rerender();
    rerender();

    expect(callback).not.toHaveBeenCalled();
  });

  it('uses the most recent callback reference on unmount', () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const thirdCallback = vi.fn();

    const { rerender, unmount } = renderHook(
      ({ cb }) => {
        const onUnmount = useUnmount();
        onUnmount(cb);
      },
      { initialProps: { cb: firstCallback } }
    );

    rerender({ cb: secondCallback });
    rerender({ cb: thirdCallback });

    unmount();

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).not.toHaveBeenCalled();
    expect(thirdCallback).toHaveBeenCalledTimes(1);
  });
});
