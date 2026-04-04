"use client";

import { useEffect, useRef } from "react";

const BIP_DURATION_S = 0.15;
/** Temps entre le début de deux paires consécutives (660 Hz + 880 Hz). */
const PAIR_INTERVAL_MS = 1500;

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
    let secondBipTimeoutId: ReturnType<typeof setTimeout>;

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
      clearInterval(intervalId);
      clearTimeout(secondBipTimeoutId);
      void ctx.close();
      ctxRef.current = null;
    };
  }, [active]);
}
