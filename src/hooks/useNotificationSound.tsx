import { useCallback, useRef, useEffect } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

// Tiny inline notification beep — avoids 404 on missing /notification.mp3
const BEEP_DATA_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export function useNotificationSound() {
  const { settings } = useUserSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(BEEP_DATA_URI);
    audioRef.current.volume = 0.5;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const playSound = useCallback(() => {
    if (settings?.notification_sound && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [settings?.notification_sound]);

  return { playSound };
}
