import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Auto-logout after idle timeout for security.
 * Resets on user interaction.
 */
export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!user) return;

    timeoutRef.current = setTimeout(() => {
      signOut();
    }, IDLE_TIMEOUT_MS);
  }, [user, signOut]);

  useEffect(() => {
    if (!user) return;

    resetTimer();

    const handler = () => resetTimer();
    ACTIVITY_EVENTS.forEach((event) =>
      document.addEventListener(event, handler, { passive: true })
    );

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach((event) =>
        document.removeEventListener(event, handler)
      );
    };
  }, [user, resetTimer]);
}
