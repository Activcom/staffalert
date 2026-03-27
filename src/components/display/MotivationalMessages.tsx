"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Soyez accueillant ! 🤝",
  "Soyez souriant ! 😊",
  "Restez attentif aux clients ! 👀",
  "Bonne journée à tous ! 👋",
] as const;

const SINGLE_MS = 2000;
const ALL_VISIBLE_MS = 15000;
const FADE_MS = 800;
/** After 4 singles (4×2s), show all together */
const PHASE1_MS = MESSAGES.length * SINGLE_MS;

type Phase = "single" | "all" | "fade";

export function MotivationalMessages() {
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState<Phase>("single");
  const [singleIndex, setSingleIndex] = useState(0);

  useEffect(() => {
    setPhase("single");
    setSingleIndex(0);
    const t1 = window.setTimeout(() => setPhase("all"), PHASE1_MS);
    const t2 = window.setTimeout(() => setPhase("fade"), PHASE1_MS + ALL_VISIBLE_MS);
    const t3 = window.setTimeout(() => {
      setCycle((c) => c + 1);
    }, PHASE1_MS + ALL_VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [cycle]);

  useEffect(() => {
    if (phase !== "single") return;
    if (singleIndex >= MESSAGES.length - 1) return;
    const id = window.setTimeout(() => {
      setSingleIndex((i) => i + 1);
    }, SINGLE_MS);
    return () => clearTimeout(id);
  }, [phase, singleIndex]);

  const visibleOpacity =
    phase === "fade" ? "opacity-0" : "opacity-100";
  const transitionClass = `transition-opacity duration-[800ms] ${visibleOpacity}`;

  return (
    <div
      className={`pointer-events-none ${transitionClass}`}
      aria-hidden
    >
      {phase === "single" && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6">
          {MESSAGES.map((text, i) => (
            <div
              key={`${cycle}-single-${i}`}
              className={
                i === singleIndex
                  ? "animate-slide-in-top text-center text-3xl font-medium text-slate-200 sm:text-4xl"
                  : "hidden"
              }
            >
              {text}
            </div>
          ))}
        </div>
      )}

      {(phase === "all" || phase === "fade") && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6">
          {MESSAGES.map((text, i) => (
            <div
              key={`${cycle}-all-${i}`}
              className="animate-slide-in-top text-center text-2xl font-medium text-slate-200 sm:text-3xl"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
