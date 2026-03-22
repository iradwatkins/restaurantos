'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseKdsAudioOptions {
  enabled?: boolean;
  volume?: number; // 0-100
  warningThresholdMinutes?: number;
  overdueThresholdMinutes?: number;
}

interface UseKdsAudioReturn {
  muted: boolean;
  setMuted: (muted: boolean) => void;
  playNewTicketTone: () => void;
  playWarningTone: () => void;
  playOverdueTone: () => void;
}

/**
 * Custom hook for KDS audio alerts using Web Audio API.
 * Lazily initializes AudioContext on first play call (browser requires user gesture).
 * Three distinct tones: new ticket (two 880Hz beeps), warning (sustained 660Hz),
 * overdue (three rapid 440Hz beeps).
 */
export function useKdsAudio(options: UseKdsAudioOptions = {}): UseKdsAudioReturn {
  const { enabled = true, volume = 70 } = options;
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioContext(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    // Resume suspended context (happens after idle or before user gesture)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  function playTone(frequency: number, durationMs: number, startOffsetMs: number = 0) {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime((volume / 100) * 0.5, ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const startTime = ctx.currentTime + startOffsetMs / 1000;
    const endTime = startTime + durationMs / 1000;

    // Fade out at the end to avoid clicks
    gainNode.gain.setValueAtTime((volume / 100) * 0.5, endTime - 0.01);
    gainNode.gain.linearRampToValueAtTime(0, endTime);

    oscillator.start(startTime);
    oscillator.stop(endTime);
  }

  const playNewTicketTone = useCallback(() => {
    if (!enabled || muted) return;
    // Two short 880Hz beeps: 100ms on, 100ms gap, 100ms on
    playTone(880, 100, 0);
    playTone(880, 100, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, muted, volume]);

  const playWarningTone = useCallback(() => {
    if (!enabled || muted) return;
    // One sustained 660Hz tone (300ms)
    playTone(660, 300, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, muted, volume]);

  const playOverdueTone = useCallback(() => {
    if (!enabled || muted) return;
    // Three rapid 440Hz beeps: 80ms on, 60ms gap each
    playTone(440, 80, 0);
    playTone(440, 80, 140);
    playTone(440, 80, 280);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, muted, volume]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  return {
    muted,
    setMuted,
    playNewTicketTone,
    playWarningTone,
    playOverdueTone,
  };
}
