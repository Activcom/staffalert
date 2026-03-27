"use client";

import { createClient } from "@/lib/supabase/client";
import type { AlertType, ScheduledMessageRow } from "@/lib/types/database";
import { type FormEvent, useCallback, useEffect, useState } from "react";

const PIN = "1234";
const STORAGE_KEY = "staffalert_admin_ok";

const DAY_LABELS = "0=dim, 1=lun, 2=mar, 3=mer, 4=jeu, 5=ven, 6=sam";

function emptyForm(): Omit<ScheduledMessageRow, "id"> {
  return {
    message: "",
    type: "routine",
    days: "1,2,3,4,5",
    time: "09:00",
    active: true,
  };
}

export function AdminClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [sendMessage, setSendMessage] = useState("");
  const [sendType, setSendType] = useState<AlertType>("routine");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendOk, setSendOk] = useState<string | null>(null);

  const [rows, setRows] = useState<ScheduledMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [newRow, setNewRow] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<ScheduledMessageRow, "id"> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY) === "1") setUnlocked(true);
  }, []);

  const loadScheduled = useCallback(async () => {
    setListError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      .order("time", { ascending: true });
    if (error) {
      setListError(error.message);
      return;
    }
    setRows((data ?? []) as ScheduledMessageRow[]);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    setLoading(true);
    void loadScheduled().finally(() => setLoading(false));
  }, [unlocked, loadScheduled]);

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
    const supabase = createClient();
    const { error } = await supabase.from("alerts").insert({
      message: sendMessage.trim(),
      type: sendType,
      status: "active",
    });
    setSendBusy(false);
    if (error) {
      setSendOk(`Erreur: ${error.message}`);
      return;
    }
    setSendMessage("");
    setSendOk("Alerte envoyée.");
  };

  const addScheduled = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRow.message.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("scheduled_messages").insert({
      message: newRow.message.trim(),
      type: newRow.type,
      days: newRow.days.replace(/\s/g, ""),
      time: newRow.time,
      active: newRow.active,
    });
    if (error) {
      setListError(error.message);
      return;
    }
    setNewRow(emptyForm());
    void loadScheduled();
  };

  const toggleActive = async (row: ScheduledMessageRow) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("scheduled_messages")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) {
      setListError(error.message);
      return;
    }
    void loadScheduled();
  };

  const removeRow = async (id: string) => {
    if (!confirm("Supprimer ce message planifié ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("scheduled_messages").delete().eq("id", id);
    if (error) {
      setListError(error.message);
      return;
    }
    void loadScheduled();
  };

  const startEdit = (row: ScheduledMessageRow) => {
    setEditingId(row.id);
    setEditDraft({
      message: row.message,
      type: row.type,
      days: row.days,
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
    const supabase = createClient();
    const { error } = await supabase
      .from("scheduled_messages")
      .update({
        message: editDraft.message.trim(),
        type: editDraft.type,
        days: editDraft.days.replace(/\s/g, ""),
        time: editDraft.time,
        active: editDraft.active,
      })
      .eq("id", editingId);
    if (error) {
      setListError(error.message);
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
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">Administration</h1>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          Verrouiller
        </button>
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
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-slate-200">Type</span>
            <label className="flex cursor-pointer items-center gap-2 text-slate-200">
              <input
                type="radio"
                name="sendType"
                checked={sendType === "routine"}
                onChange={() => setSendType("routine")}
              />
              ROUTINE
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-slate-200">
              <input
                type="radio"
                name="sendType"
                checked={sendType === "urgent"}
                onChange={() => setSendType("urgent")}
              />
              URGENT
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
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Jours (ex: 1,2,3,4,5)"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
              value={newRow.days}
              onChange={(e) => setNewRow({ ...newRow, days: e.target.value })}
            />
            <input
              type="time"
              className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
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

        {listError && <p className="mb-4 text-sm text-red-400">{listError}</p>}
        {loading ? (
          <p className="text-slate-400">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-400">Aucun message planifié.</p>
        ) : (
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
                    <div className="flex flex-wrap gap-3">
                      <input
                        type="text"
                        className="min-w-[180px] flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
                        value={editDraft.days}
                        onChange={(e) => setEditDraft({ ...editDraft, days: e.target.value })}
                      />
                      <input
                        type="time"
                        className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{row.message}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {row.type === "urgent" ? "URGENT" : "ROUTINE"} · {row.time} · jours {row.days} ·{" "}
                        {row.active ? "actif" : "inactif"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
        )}
      </section>
    </main>
  );
}
