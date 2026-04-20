"use client";

import { useEffect, useRef } from "react";

/** Pulse 1 : Sol3. */
const PULSE1_HZ = 392;
/** Pulse 2 : Mi3. */
const PULSE2_HZ = 330;
const PULSE_DURATION_S = 0.18;
/** Pulse 2 commence 150 ms après le début du pulse 1. */
const PULSE2_OFFSET_S = 0.15;
/** Pause après la fin du pulse 2 avant la paire suivante. */
const PAUSE_AFTER_PAIR_S = 1.1;
/** Fin pulse 2 → début de la paire suivante (pause 1.1 s inchangée). */
const PAIR_CYCLE_MS = (PULSE2_OFFSET_S + PULSE_DURATION_S + PAUSE_AFTER_PAIR_S) * 1000;

const ATTACK_S = 0.008;
const DECAY_S = 0.04;
const SUSTAIN_LEVEL = 0.6;
/** Pic de l’octave supérieure (fondamental reste à 1.0). */
const HARMONIC_PEAK = 0.3;
/** Filtre lowpass un peu plus ouvert pour préserver les harmoniques du triangle. */
const LOWPASS_HZ = 3500;

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

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, ctx.currentTime);
    compressor.knee.setValueAtTime(5, ctx.currentTime);
    compressor.ratio.setValueAtTime(12, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.1, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    filter.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const scheduleEnvelope = (gainNode: GainNode, startTime: number, peakLevel: number) => {
      const sustain = peakLevel * SUSTAIN_LEVEL;
      const end = startTime + PULSE_DURATION_S;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(peakLevel, startTime + ATTACK_S);
      gainNode.gain.linearRampToValueAtTime(sustain, startTime + ATTACK_S + DECAY_S);
      gainNode.gain.linearRampToValueAtTime(0.0001, end);
    };

    const schedulePulse = (frequencyHz: number, startTime: number) => {
      const stopAt = startTime + PULSE_DURATION_S;

      const oscFund = ctx.createOscillator();
      oscFund.type = "triangle";
      oscFund.frequency.setValueAtTime(frequencyHz, startTime);
      const envFund = ctx.createGain();
      scheduleEnvelope(envFund, startTime, 1);
      oscFund.connect(envFund);
      envFund.connect(filter);

      const oscHarm = ctx.createOscillator();
      oscHarm.type = "triangle";
      oscHarm.frequency.setValueAtTime(frequencyHz * 2, startTime);
      const envHarm = ctx.createGain();
      scheduleEnvelope(envHarm, startTime, HARMONIC_PEAK);
      oscHarm.connect(envHarm);
      envHarm.connect(filter);

      oscFund.start(startTime);
      oscHarm.start(startTime);
      oscFund.stop(stopAt);
      oscHarm.stop(stopAt);
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
