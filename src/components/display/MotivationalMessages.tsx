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
/** Durée pour afficher les 4 phrases une par une (4 × 2 s) */
const REVEAL_TOTAL_MS = MESSAGES.length * SINGLE_MS;

type SubPhase = "reveal" | "hold" | "fade";

const lineClass =
  "text-center text-2xl font-medium text-slate-200 sm:text-3xl";

export function MotivationalMessages() {
  const [cycle, setCycle] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [subPhase, setSubPhase] = useState<SubPhase>("reveal");

  useEffect(() => {
    setVisibleCount(1);
    setSubPhase("reveal");

    const timeouts: number[] = [];

    for (let next = 2; next <= MESSAGES.length; next++) {
      timeouts.push(
        window.setTimeout(() => setVisibleCount(next), SINGLE_MS * (next - 1))
      );
    }

    timeouts.push(
      window.setTimeout(() => setSubPhase("hold"), REVEAL_TOTAL_MS)
    );

    timeouts.push(
      window.setTimeout(
        () => setSubPhase("fade"),
        REVEAL_TOTAL_MS + ALL_VISIBLE_MS
      )
    );

    timeouts.push(
      window.setTimeout(
        () => setCycle((c) => c + 1),
        REVEAL_TOTAL_MS + ALL_VISIBLE_MS + FADE_MS
      )
    );

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [cycle]);

  const visibleOpacity = subPhase === "fade" ? "opacity-0" : "opacity-100";
  const transitionClass = `transition-opacity duration-[800ms] ${visibleOpacity}`;

  return (
    <div
      className={`pointer-events-none ${transitionClass}`}
      aria-hidden
    >
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6">
        {MESSAGES.map((text, i) => {
          if (i >= visibleCount) return null;
          const slideIn =
            subPhase === "reveal" && i === visibleCount - 1;
          return (
            <div
              key={`${cycle}-${i}`}
              className={
                slideIn
                  ? `animate-slide-in-top ${lineClass}`
                  : lineClass
              }
            >
              {text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
