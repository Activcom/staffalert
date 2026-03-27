import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 p-8">
      <h1 className="text-3xl font-semibold text-white">Staff Alert</h1>
      <nav className="flex flex-col gap-4 sm:flex-row">
        <Link
          className="rounded-lg bg-slate-800 px-6 py-3 text-center text-white transition hover:bg-slate-700"
          href="/display-screen"
        >
          Écran d&apos;affichage
        </Link>
        <Link
          className="rounded-lg bg-emerald-700 px-6 py-3 text-center text-white transition hover:bg-emerald-600"
          href="/admin"
        >
          Administration
        </Link>
      </nav>
    </main>
  );
}
