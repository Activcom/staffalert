"use client";

import { useEffect, useRef } from "react";

const ALERT_SOUND_SRC = "/sounds/alerte.mp3";

/**
 * Lecture en boucle de `/public/sounds/alerte.mp3` tant que `active` est vrai.
 * Un seul `HTMLAudioElement` pour la durée de vie du composant qui utilise le hook.
 */
export function useAlertBeep(active: boolean): void {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(ALERT_SOUND_SRC);
    audio.loop = true;
    audio.volume = 1.0;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (active) {
      void audio.play().catch(() => {
        /* autoplay / politique navigateur */
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [active]);
}
