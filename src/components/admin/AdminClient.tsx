"use client";

import {
  deleteAlert,
  deleteScheduledMessage,
  insertAlert,
  insertScheduledMessage,
  listRecentAlerts,
  listScheduledMessages,
  setScheduledActive,
  updateScheduledMessage,
} from "@/app/actions/admin-data";
import { reloadPostgrestSchema } from "@/app/actions/reload-postgrest-schema";
import { isPostgrestSchemaCacheError } from "@/lib/supabase/schema-cache-error";
import type { AlertType, ScheduledMessageRow } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { formatDaysToLabels } from "@/lib/time/paris";
import { type FormEvent, useCallback, useEffect, useState } from "react";

const PIN = "1234";
const STORAGE_KEY = "staffalert_admin_ok";

const DAY_LABELS = "0=dim, 1=lun, 2=mar, 3=mer, 4=jeu, 5=ven, 6=sam";

const DAYS_PICKER_ORDER: { day: number; label: string }[] = [
  { day: 1, label: "L" },
  { day: 2, label: "M" },
  { day: 3, label: "Me" },
  { day: 4, label: "J" },
  { day: 5, label: "V" },
  { day: 6, label: "S" },
  { day: 0, label: "D" },
];

function DaysPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (day: number) => {
    const has = value.includes(day);
    const next = has
      ? value.filter((d) => d !== day)
      : [...value, day].sort((a, b) => a - b);
    onChange(next);
  };

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2">
      {DAYS_PICKER_ORDER.map(({ day, label }) => (
        <label
          key={day}
          className="flex min-w-[2.5rem] cursor-pointer items-center gap-2 text-sm text-slate-200"
        >
          <input
            type="checkbox"
            checked={value.includes(day)}
            onChange={() => toggle(day)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

/** Formulaire : `days` est un tableau d’entiers 0–6 (jours). */
type ScheduledDraft = {
  message: string;
  type: AlertType;
  days: number[];
  time: string;
  active: boolean;
};

function emptyForm(): ScheduledDraft {
  return {
    message: "",
    type: "routine",
    days: [1, 2, 3, 4, 5],
    time: "09:00",
    active: true,
  };
}

export function AdminClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [sendMessage, setSendMessage] = useState("");
  const [sendType, setSendType] = useState<AlertType>("urgent");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendOk, setSendOk] = useState<string | null>(null);

  const [rows, setRows] = useState<ScheduledMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [schemaReloadBusy, setSchemaReloadBusy] = useState(false);
  const [schemaReloadHint, setSchemaReloadHint] = useState<string | null>(null);

  const [newRow, setNewRow] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ScheduledDraft | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<{ id: string; message: string }[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY) === "1") setUnlocked(true);
  }, []);

  const loadScheduled = useCallback(async (): Promise<boolean> => {
    setListError(null);
    const { rows, error } = await listScheduledMessages();
    if (error) {
      setListError(error);
      return false;
    }
    setRows(rows ?? []);
    return true;
  }, []);

  const fetchPendingCount = useCallback(async () => {
    const supabase = createClient();
    const { count, error } = await supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    if (error) {
      return;
    }
    setPendingCount(count ?? 0);
  }, []);

  const loadRecentAlerts = useCallback(async () => {
    const { rows, error } = await listRecentAlerts();
    if (error) {
      return;
    }
    setRecentAlerts(rows ?? []);
  }, []);

  const removeRecentAlert = useCallback(
    async (id: string) => {
      const { error } = await deleteAlert(id);
      if (error) {
        return;
      }
      void loadRecentAlerts();
    },
    [loadRecentAlerts]
  );

  const schemaListIssue = Boolean(listError && isPostgrestSchemaCacheError(listError));

  const reloadSchemaAndRetry = useCallback(async () => {
    setSchemaReloadHint(null);
    setSchemaReloadBusy(true);
    try {
      const result = await reloadPostgrestSchema();
      if (!result.ok) {
        setSchemaReloadHint(result.message);
        return;
      }
      setSchemaReloadHint("Cache API mis à jour. Rechargement de la liste…");
      const ok = await loadScheduled();
      if (ok) {
        setSchemaReloadHint(null);
      }
    } finally {
      setSchemaReloadBusy(false);
    }
  }, [loadScheduled]);

  useEffect(() => {
    if (!unlocked) return;
    setLoading(true);
    void fetchPendingCount();
    void loadRecentAlerts();
    void loadScheduled().finally(() => setLoading(false));
  }, [unlocked, loadScheduled, fetchPendingCount, loadRecentAlerts]);

  useEffect(() => {
    if (!unlocked) return;
    const supabase = createClient();
    const topic = `alerts-${
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }`;
    const channel = supabase
      .channel(topic, { config: { private: false } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => {
          void fetchPendingCount();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void fetchPendingCount();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [unlocked, fetchPendingCount]);

  const submitPin = (e: FormEvent) => {
    e.preventDefault();
    if (pinInput === PIN) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
    setPinInput("");
  };

  const sendAlert = async (e: FormEvent) => {
    e.preventDefault();
    if (!sendMessage.trim()) return;
    setSendBusy(true);
    setSendOk(null);
    const { error } = await insertAlert(sendMessage.trim(), sendType);
    setSendBusy(false);
    if (error) {
      setSendOk(`Erreur: ${error}`);
      return;
    }
    setSendMessage("");
    void loadRecentAlerts();
    setSendOk("Alerte envoyée.");
  };

  const addScheduled = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRow.message.trim()) return;
    const { error } = await insertScheduledMessage(newRow);
    if (error) {
      setListError(error);
      return;
    }
    setNewRow(emptyForm());
    void loadScheduled();
  };

  const toggleActive = async (row: ScheduledMessageRow) => {
    const { error } = await setScheduledActive(row.id, !row.active);
    if (error) {
      setListError(error);
      return;
    }
    void loadScheduled();
  };

  const removeRow = async (id: string) => {
    if (!confirm("Supprimer ce message planifié ?")) return;
    const { error } = await deleteScheduledMessage(id);
    if (error) {
      setListError(error);
      return;
    }
    void loadScheduled();
  };

  const startEdit = (row: ScheduledMessageRow) => {
    setEditingId(row.id);
    setEditDraft({
      message: row.message,
      type: row.type,
      days: Array.isArray(row.days) ? row.days : [],
      time: row.time,
      active: row.active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    const { error } = await updateScheduledMessage(editingId, editDraft);
    if (error) {
      setListError(error);
      return;
    }
    cancelEdit();
    void loadScheduled();
  };

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
        <h1 className="text-2xl font-semibold text-white">Administration</h1>
        <form onSubmit={submitPin} className="flex flex-col gap-4 rounded-xl bg-slate-900 p-6 ring-1 ring-slate-700">
          <label className="text-sm text-slate-200">Code PIN</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-lg text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
          />
          {pinError && <p className="text-sm text-red-400">PIN incorrect.</p>}
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500"
          >
            Déverrouiller
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-white">Administration</h1>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://staffalert.vercel.app/display-screen"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              Écran d&apos;affichage
            </a>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              Déconnexion
            </button>
          </div>
        </div>
        {pendingCount === 0 ? (
          <div className="flex w-full items-center justify-center gap-2 text-center text-sm text-slate-400">
            <span aria-hidden="true">✓</span>
            <span>Aucun message en attente</span>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 text-center text-sm font-medium text-amber-400">
            <span aria-hidden="true">⚠</span>
            <span>
              {pendingCount} message(s) en attente de confirmation
            </span>
          </div>
        )}
      </header>

      <section className="mb-10 rounded-xl bg-slate-900 p-6 ring-1 ring-slate-700">
        <h2 className="mb-4 text-lg font-medium text-white">Envoyer une alerte</h2>
        <form onSubmit={sendAlert} className="flex flex-col gap-4">
          <textarea
            required
            rows={3}
            placeholder="Message affiché sur l&apos;écran"
            className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={sendMessage}
            onChange={(e) => setSendMessage(e.target.value)}
          />
          {recentAlerts.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-400">Messages récents :</p>
              <ul className="flex flex-col gap-2">
                {recentAlerts.reduce<{ id: string; message: string }[]>((acc, row) => {
                  if (acc.some((x) => x.message === row.message)) return acc;
                  return [...acc, row];
                }, []).map((alert) => (
                  <li key={alert.id}>
                    <div className="flex w-full items-center justify-between rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left text-slate-200"
                        onClick={() => setSendMessage(alert.message)}
                      >
                        {alert.message}
                      </button>
                      <button
                        type="button"
                        className="ml-2 flex-shrink-0 text-slate-400 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeRecentAlert(alert.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-slate-200">Type</span>
            <label className="flex cursor-pointer items-center gap-2 text-slate-200">
              <input
                type="radio"
                name="sendType"
                checked={sendType === "urgent"}
                onChange={() => setSendType("urgent")}
              />
              URGENT
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-slate-200">
              <input
                type="radio"
                name="sendType"
                checked={sendType === "routine"}
                onChange={() => setSendType("routine")}
              />
              ROUTINE
            </label>
          </div>
          <button
            type="submit"
            disabled={sendBusy}
            className="rounded-lg bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Envoyer
          </button>
          {sendOk && <p className="text-sm text-slate-300">{sendOk}</p>}
        </form>
      </section>

      <section className="rounded-xl bg-slate-900 p-6 ring-1 ring-slate-700">
        <h2 className="mb-2 text-lg font-medium text-white">Messages planifiés</h2>
        <p className="mb-6 text-sm text-slate-400">
          Heure et jours en fuseau Europe/Paris. Jours : {DAY_LABELS}
        </p>

        <form onSubmit={addScheduled} className="mb-8 flex flex-col gap-3 rounded-lg bg-slate-950/50 p-4">
          <h3 className="text-sm font-medium text-slate-200">Ajouter</h3>
          <input
            type="text"
            placeholder="Message"
            className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
            value={newRow.message}
            onChange={(e) => setNewRow({ ...newRow, message: e.target.value })}
          />
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-slate-200">
              <input
                type="radio"
                checked={newRow.type === "routine"}
                onChange={() => setNewRow({ ...newRow, type: "routine" })}
              />
              ROUTINE
            </label>
            <label className="flex items-center gap-2 text-slate-200">
              <input
                type="radio"
                checked={newRow.type === "urgent"}
                onChange={() => setNewRow({ ...newRow, type: "urgent" })}
              />
              URGENT
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DaysPicker
              value={newRow.days}
              onChange={(days) => setNewRow({ ...newRow, days })}
            />
            <input
              type="time"
              className="w-fit rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
              value={newRow.time}
              onChange={(e) => setNewRow({ ...newRow, time: e.target.value })}
            />
            <label className="flex items-center gap-2 text-slate-200">
              <input
                type="checkbox"
                checked={newRow.active}
                onChange={(e) => setNewRow({ ...newRow, active: e.target.checked })}
              />
              Actif
            </label>
          </div>
          <button type="submit" className="w-fit rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">
            Ajouter
          </button>
        </form>

        {schemaListIssue && (
          <div
            className="mb-4 rounded-lg border border-amber-500/50 bg-amber-950/30 p-4 text-amber-100"
            role="status"
          >
            <p className="font-medium text-amber-50">
              L&apos;API Supabase ne voit pas encore la table (cache schéma PostgREST).
            </p>
            <p className="mt-2 text-sm text-amber-200/90">{listError}</p>
            {schemaReloadHint && (
              <p className="mt-2 text-sm text-amber-100/90">{schemaReloadHint}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={schemaReloadBusy}
                onClick={() => void reloadSchemaAndRetry()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-500 disabled:opacity-50"
              >
                {schemaReloadBusy ? "Rechargement…" : "Rafraîchir le cache API et réessayer"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-amber-200/75">
              Sans clé « service_role » sur le serveur : ouvrez Supabase → SQL et exécutez{" "}
              <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-amber-50">
                SELECT pg_notify(&apos;pgrst&apos;, &apos;reload schema&apos;);
              </code>{" "}
              puis réessayez. Pour le bouton ci-dessus, ajoutez{" "}
              <code className="rounded bg-black/40 px-1 font-mono">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              (Vercel / .env.local) et la fonction SQL{" "}
              <code className="rounded bg-black/40 px-1 font-mono">reload_postgrest_schema</code>{" "}
              (<code className="rounded bg-black/40 px-1 font-mono">002_reload_postgrest_schema.sql</code>
              ).
            </p>
          </div>
        )}
        {listError && !schemaListIssue && (
          <p className="mb-4 text-sm text-red-400">{listError}</p>
        )}
        {loading ? (
          <p className="text-slate-400">Chargement…</p>
        ) : !listError && rows.length === 0 ? (
          <p className="text-slate-400">Aucun message planifié.</p>
        ) : !listError && rows.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-slate-700 bg-slate-950/50 p-4"
              >
                {editingId === row.id && editDraft ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      rows={2}
                      className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
                      value={editDraft.message}
                      onChange={(e) => setEditDraft({ ...editDraft, message: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-slate-200">
                        <input
                          type="radio"
                          checked={editDraft.type === "routine"}
                          onChange={() => setEditDraft({ ...editDraft, type: "routine" })}
                        />
                        ROUTINE
                      </label>
                      <label className="flex items-center gap-2 text-slate-200">
                        <input
                          type="radio"
                          checked={editDraft.type === "urgent"}
                          onChange={() => setEditDraft({ ...editDraft, type: "urgent" })}
                        />
                        URGENT
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <DaysPicker
                        value={editDraft.days}
                        onChange={(days) => setEditDraft({ ...editDraft, days })}
                      />
                      <input
                        type="time"
                        className="w-fit rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
                        value={editDraft.time}
                        onChange={(e) => setEditDraft({ ...editDraft, time: e.target.value })}
                      />
                      <label className="flex items-center gap-2 text-slate-200">
                        <input
                          type="checkbox"
                          checked={editDraft.active}
                          onChange={(e) => setEditDraft({ ...editDraft, active: e.target.checked })}
                        />
                        Actif
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium text-white">{row.message}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {row.type === "urgent" ? "URGENT" : "ROUTINE"} · {row.time} · jours{" "}
                        {formatDaysToLabels(row.days)} ·{" "}
                        {row.active ? "actif" : "inactif"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-nowrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(row)}
                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
                      >
                        {row.active ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="rounded-lg bg-red-900/80 px-3 py-1.5 text-sm text-white hover:bg-red-800"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
