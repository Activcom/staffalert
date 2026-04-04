"use client";

import { useEffect, useRef } from "react";

const BIP_DURATION_S = 0.15;
const PAIR_GAP_MS = 1200;
/** Durée d'une paire (660 Hz puis 880 Hz) + silence jusqu’à la paire suivante */
const PAIR_CYCLE_MS = BIP_DURATION_S * 2 * 1000 + PAIR_GAP_MS;

/** Double bip (sine) via Web Audio API — alertes urgentes. */
export function useAlertBeep(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active) {
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    ctxRef.current = ctx;

    const gain = ctx.createGain();
    gain.gain.value = 0.12;
    gain.connect(ctx.destination);

    let intervalId: ReturnType<typeof setInterval>;

    const playPair = () => {
      const t0 = ctx.currentTime;

      const first = ctx.createOscillator();
      first.type = "sine";
      first.frequency.value = 660;
      first.connect(gain);
      first.start(t0);
      first.stop(t0 + BIP_DURATION_S);

      const second = ctx.createOscillator();
      second.type = "sine";
      second.frequency.value = 880;
      second.connect(gain);
      second.start(t0 + BIP_DURATION_S);
      second.stop(t0 + BIP_DURATION_S * 2);
    };

    void ctx.resume().then(() => {
      playPair();
      intervalId = setInterval(playPair, PAIR_CYCLE_MS);
    });

    return () => {
      clearInterval(intervalId);
      void ctx.close();
      ctxRef.current = null;
    };
  }, [active]);
}
