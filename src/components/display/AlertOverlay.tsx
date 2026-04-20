"use client";

import type { AlertRow } from "@/lib/types/database";
import { useAlertBeep } from "./useAlertBeep";

type Props = {
  alert: AlertRow;
  onDismiss: () => void;
  pendingCount?: number;
};

export function AlertOverlay({ alert, onDismiss, pendingCount = 0 }: Props) {
  const urgent = alert.type === "urgent";
  useAlertBeep(true);

  const bgClass = urgent ? "animate-pulse-urgent" : "animate-pulse-routine";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 px-6 ${bgClass}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-title"
    >
      {pendingCount > 0 ? (
        <div
          className="absolute left-1/2 top-4 z-[60] inline-flex w-fit max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center justify-center rounded-full bg-black/45 px-4 py-2 text-center text-sm font-medium text-white sm:text-base"
          aria-live="polite"
        >
          +{pendingCount} message(s) en attente
        </div>
      ) : null}
      <p
        id="alert-title"
        className="max-w-[95vw] text-center text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl lg:text-8xl"
      >
        {alert.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-2xl bg-white/95 px-14 py-5 text-2xl font-semibold text-slate-900 shadow-lg transition hover:bg-white sm:text-3xl"
      >
        J&apos;ai compris
      </button>
    </div>
  );
}
