import { useCallback, useRef, useEffect } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

export function useNotificationSound() {
  const { settings } = useUserSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
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
