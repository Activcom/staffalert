"use client";

import { useEffect, useRef } from "react";

/** Looping short beeps via Web Audio API (urgent alerts). */
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

    const beep = () => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 440;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    };

    void ctx.resume().then(() => {
      beep();
      intervalId = setInterval(beep, 800);
    });

    return () => {
      clearInterval(intervalId);
      void ctx.close();
      ctxRef.current = null;
    };
  }, [active]);
}
