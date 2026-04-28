import { useEffect, useRef } from 'react';

export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean,
): void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      callbackRef.current();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
