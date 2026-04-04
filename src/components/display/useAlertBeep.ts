"use client";

import { useEffect, useRef } from "react";

const BIP_DURATION_S = 0.15;
const PAIR_INTERVAL_MS = 1500;

const UNLOCK_EVENTS = ["pointerdown", "touchstart", "click"] as const;

/**
 * Double bip (sine) — alertes urgentes.
 * Safari / iOS : l’AudioContext reste souvent « suspended » tant que `resume()` n’est pas
 * appelé dans une interaction utilisateur ; un `resume()` depuis un effet React ne suffit pas.
 */
export function useAlertBeep(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const loopStartedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      loopStartedRef.current = false;
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let secondBipTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let ctx: AudioContext | null = null;
    let gain: GainNode | null = null;

    const ensureGraph = () => {
      if (ctx) return;
      ctx = new AudioContextClass();
      ctxRef.current = ctx;
      gain = ctx.createGain();
      gain.gain.value = 0.12;
      gain.connect(ctx.destination);
    };

    const beepAtFreq = (hz: number) => {
      if (!ctx || !gain || ctx.state !== "running") return;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = hz;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + BIP_DURATION_S);
    };

    const playPair = () => {
      if (!ctx || ctx.state !== "running") return;
      beepAtFreq(660);
      secondBipTimeoutId = window.setTimeout(() => {
        beepAtFreq(880);
      }, BIP_DURATION_S * 1000);
    };

    const startLoopIfRunning = () => {
      if (!ctx || ctx.state !== "running" || loopStartedRef.current) return;
      loopStartedRef.current = true;
      playPair();
      intervalId = window.setInterval(playPair, PAIR_INTERVAL_MS);
    };

    /** À appeler depuis un geste utilisateur (Safari) ou après resume OK (Chrome). */
    const tryResumeAndStart = () => {
      ensureGraph();
      if (!ctx) return;
      void ctx.resume().then(() => {
        startLoopIfRunning();
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && ctx) {
        void ctx.resume();
      }
    };

    const onUnlock = () => {
      tryResumeAndStart();
    };

    UNLOCK_EVENTS.forEach((ev) => {
      window.addEventListener(ev, onUnlock, { capture: true, passive: true });
    });
    document.addEventListener("visibilitychange", onVisibility);

    // Chrome : resume depuis l’effet suffit souvent. Safari : besoin d’un geste → onUnlock.
    tryResumeAndStart();

    return () => {
      loopStartedRef.current = false;
      UNLOCK_EVENTS.forEach((ev) => {
        window.removeEventListener(ev, onUnlock, { capture: true });
      });
      document.removeEventListener("visibilitychange", onVisibility);
      if (intervalId !== undefined) window.clearInterval(intervalId);
      if (secondBipTimeoutId !== undefined) window.clearTimeout(secondBipTimeoutId);
      if (ctx) {
        void ctx.close();
      }
      ctxRef.current = null;
    };
  }, [active]);
}
