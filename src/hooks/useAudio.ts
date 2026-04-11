import { useCallback, useRef, useEffect } from 'react';
import type { UserProfile } from '../types/game';

// We create an Audio stub system. In a real environment, we'd load correct base64 or paths.
// We use synthetic AudioContext beeps as fallbacks since assets aren't provided.

const createBeep = (freq: number, type: OscillatorType, duration: number, vol: number) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio errors on autoplay policies
  }
};

export function useAudio(profile: UserProfile) {
  const isEnabled = profile.audioEnabled;
  const vol = profile.audioVolume;
  
  const winAudioRef = useRef<HTMLAudioElement | null>(null);
  const pourAudioRef = useRef<HTMLAudioElement | null>(null);
  const tubeCompleteAudioRef = useRef<HTMLAudioElement | null>(null);
  const congratulationsAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    winAudioRef.current = new Audio('/AudioFiles/applause.mp3');
    pourAudioRef.current = new Audio('/AudioFiles/BilliardsBall.mp3');
    tubeCompleteAudioRef.current = new Audio('/AudioFiles/FadeAway.mp3');
    congratulationsAudioRef.current = new Audio('/AudioFiles/Congratulations.mp3');
  }, []);

  const playClick = useCallback(() => {
    if (!isEnabled) return;
    createBeep(600, 'sine', 0.1, vol * 0.5);
  }, [isEnabled, vol]);

  const playPour = useCallback(() => {
    if (!isEnabled || !pourAudioRef.current) return;
    try {
      const audio = pourAudioRef.current;
      audio.volume = vol;
      audio.currentTime = 0;
      audio.play().catch(e => console.log('Audio blocked', e));
    } catch (e) {}
  }, [isEnabled, vol]);

  const playError = useCallback(() => {
    if (!isEnabled) return;
    createBeep(150, 'sawtooth', 0.2, vol * 0.5);
  }, [isEnabled, vol]);

  const playWin = useCallback(() => {
    if (!isEnabled || !winAudioRef.current) return;
    try {
      const audio = winAudioRef.current;
      if (audio.paused || audio.ended) {
        audio.volume = vol;
        audio.currentTime = 0;
        audio.play().catch(err => console.log('Audio blocked', err));
      }
    } catch (e) {}
  }, [isEnabled, vol]);

  const playTubeComplete = useCallback(() => {
    if (!isEnabled || !tubeCompleteAudioRef.current) return;
    try {
       const audio = tubeCompleteAudioRef.current;
       audio.volume = vol;
       audio.currentTime = 0;
       audio.play().catch(e => console.log('Audio blocked', e));
    } catch (e) {}
  }, [isEnabled, vol]);

  const playCongratulations = useCallback(() => {
    if (!isEnabled || !congratulationsAudioRef.current) return;
    try {
       const audio = congratulationsAudioRef.current;
       audio.volume = vol;
       audio.currentTime = 0;
       audio.play().catch(e => console.log('Audio blocked', e));
    } catch (e) {}
  }, [isEnabled, vol]);

  return { playClick, playPour, playError, playWin, playTubeComplete, playCongratulations };
}
