'use client';

import { useCallback } from 'react';

// Simple notification sound hook
export function useNotificationSound() {
  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple notification tone using Web Audio API
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Create a gentle notification sound (two quick beeps)
      const createBeep = (
        frequency: number,
        duration: number,
        delay: number = 0
      ) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime + delay
        );
        oscillator.type = 'sine';

        // Gentle fade in and out
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(
          0.1,
          audioContext.currentTime + delay + 0.02
        );
        gainNode.gain.linearRampToValueAtTime(
          0,
          audioContext.currentTime + delay + duration
        );

        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + duration);
      };

      // Two gentle beeps with slight delay
      createBeep(800, 0.1, 0); // First beep
      createBeep(1000, 0.1, 0.15); // Second beep slightly higher
    } catch (error) {
      // Fallback for browsers that don't support Web Audio API
      // or when user hasn't interacted with the page yet
      console.debug('Notification sound failed:', error);
    }
  }, []);

  return { playNotificationSound };
}

