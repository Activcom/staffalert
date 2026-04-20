"use client";

import { useEffect, useRef } from "react";

/** Pulse 1 : Sol3. */
const PULSE1_HZ = 392;
/** Pulse 2 : Mi3. */
const PULSE2_HZ = 330;
const PULSE_DURATION_S = 0.12;
/** Pulse 2 commence 150 ms après le début du pulse 1. */
const PULSE2_OFFSET_S = 0.15;
/** Pause après la fin du pulse 2 avant la paire suivante. */
const PAUSE_AFTER_PAIR_S = 1.1;
/** Fin pulse 2 → début de la paire suivante : 150ms + 120ms + 1100ms. */
const PAIR_CYCLE_MS = (PULSE2_OFFSET_S + PULSE_DURATION_S + PAUSE_AFTER_PAIR_S) * 1000;

const ATTACK_S = 0.008;
const DECAY_S = 0.04;
const SUSTAIN_LEVEL = 0.6;
/** Filtre doux sur le bus (Chrome / tablette display). */
const LOWPASS_HZ = 2000;

/**
 * Son type « Impulsions » (Pulse) : deux pulses rapprochés, pause, boucle via Web Audio API.
 * Une seule boucle / un seul AudioContext tant que `active` est vrai (pas d’empilement).
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

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(LOWPASS_HZ, ctx.currentTime);
    filter.Q.setValueAtTime(0.7, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const schedulePulse = (frequencyHz: number, startTime: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequencyHz, startTime);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(1, startTime + ATTACK_S);
      env.gain.linearRampToValueAtTime(SUSTAIN_LEVEL, startTime + ATTACK_S + DECAY_S);
      env.gain.linearRampToValueAtTime(0.0001, startTime + PULSE_DURATION_S);

      osc.connect(env);
      env.connect(filter);
      osc.start(startTime);
      osc.stop(startTime + PULSE_DURATION_S);
    };

    const playPair = () => {
      const lead = 0.02;
      const t0 = ctx.currentTime + lead;
      schedulePulse(PULSE1_HZ, t0);
      schedulePulse(PULSE2_HZ, t0 + PULSE2_OFFSET_S);
    };

    void ctx.resume().then(() => {
      if (cancelled) return;
      playPair();
      intervalId = setInterval(playPair, PAIR_CYCLE_MS);
    });

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
      void ctx.suspend().catch(() => {
        /* noop */
      });
      void ctx.close();
      ctxRef.current = null;
    };
  }, [active]);
}
