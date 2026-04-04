"use client";

import { useEffect, useRef } from "react";

const BIP_DURATION_S = 0.15;
/** Début d’une paire → début de la suivante (660 Hz + 880 Hz puis pause). */
const PAIR_INTERVAL_MS = 1500;

/**
 * Double bip (sine 660 Hz puis 880 Hz) via Web Audio API — alertes urgentes.
 * Version simple : resume() depuis l’effet + setInterval (sans déblocage tactile).
 */
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

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let secondBipTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const beepAtFreq = (hz: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = hz;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + BIP_DURATION_S);
    };

    const playPair = () => {
      beepAtFreq(660);
      secondBipTimeoutId = setTimeout(() => {
        beepAtFreq(880);
      }, BIP_DURATION_S * 1000);
    };

    void ctx.resume().then(() => {
      playPair();
      intervalId = setInterval(playPair, PAIR_INTERVAL_MS);
    });

    return () => {
      if (intervalId !== undefined) clearInterval(intervalId);
      if (secondBipTimeoutId !== undefined) clearTimeout(secondBipTimeoutId);
      void ctx.close();
      ctxRef.current = null;
    };
  }, [active]);
}
