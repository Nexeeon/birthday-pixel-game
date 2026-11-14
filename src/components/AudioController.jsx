import React, { useState, useEffect, useRef } from 'react';
import soundtrackSrc from '../../asset/soundtrack.mp3';

/**
 * AudioController
 * - Background music (BGM) playback with precise 30% volume (0.3)
 * - Looping enabled
 * - Browser Autoplay policy compliance: one-time user interaction listener
 * - Auto-pauses when cutscene video is playing, resumes on envelope/letter
 * - Floating retro pixel art mute/unmute button at bottom-right corner
 */
export default function AudioController({
  isCutscenePlaying = false,
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const audioRef = useRef(null);

  // Initialize Audio
  useEffect(() => {
    const audio = new Audio(soundtrackSrc);
    audio.loop = true;
    audio.volume = 0.3; // Default 30% volume
    audioRef.current = audio;

    // Autoplay compliance: start audio on first user interaction (click, keydown, touchstart)
    const handleFirstInteraction = () => {
      if (audioRef.current && !hasStarted) {
        audioRef.current.volume = 0.3;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setHasStarted(true);
              removeListeners();
            })
            .catch((err) => {
              console.warn('Playback waiting for further user interaction:', err);
            });
        }
      }
    };

    const removeListeners = () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });

    return () => {
      removeListeners();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sync with Cutscene Video (Pause during video, resume after)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isCutscenePlaying) {
      // Pause soundtrack while ending video plays
      audio.pause();
    } else {
      // Resume if not muted and game has started
      if (!isMuted && hasStarted) {
        audio.volume = 0.3;
        audio.play().catch((e) => console.warn('Audio resume error:', e));
      }
    }
  }, [isCutscenePlaying, isMuted, hasStarted]);

  // Handle Mute / Unmute Toggle
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      // Unmute
      audio.muted = false;
      audio.volume = 0.3;
      if (!isCutscenePlaying) {
        audio.play().catch((e) => console.warn('Audio play error:', e));
      }
      setIsMuted(false);
      setHasStarted(true);
    } else {
      // Mute
      audio.muted = true;
      setIsMuted(true);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-pixel select-none pointer-events-auto">
      <button
        onClick={toggleMute}
        title={isMuted ? 'Nyalakan Musik (Unmute)' : 'Matikan Musik (Mute)'}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 shadow-2xl transition-all duration-200 active:scale-95 ${
          isMuted
            ? 'bg-slate-900/90 border-slate-600 text-slate-400 hover:border-slate-400 opacity-80 hover:opacity-100'
            : 'bg-black/90 border-amber-400 text-yellow-300 hover:bg-slate-900 hover:border-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
        }`}
      >
        <span className="text-sm sm:text-base">{isMuted ? '🔇' : '🔊'}</span>
        <div className="flex flex-col text-left">
          <span className="text-[8px] sm:text-[9px] font-bold leading-tight">
            {isMuted ? 'MUTE' : 'BGM'}
          </span>
          <span className="text-[7px] text-slate-400 font-sans leading-none">
            {isMuted ? 'Off' : '30%'}
          </span>
        </div>

        {/* Status Dot */}
        <span
          className={`w-2 h-2 rounded-full ml-0.5 ${
            isMuted ? 'bg-red-500' : 'bg-green-400 animate-pulse'
          }`}
        />
      </button>
    </div>
  );
}

