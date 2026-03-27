# Staff Alert

Next.js 15 app : écran d’affichage avec messages motivants, alertes temps réel (Supabase), administration par PIN, et envoi planifié via cron Vercel.

## Prérequis

- Node.js 18+
- Projet Supabase (URL fournie) et clé **anon** (Settings → API)

## Installation

```bash
npm install
cp .env.local.example .env.local
```

Renseigner dans `.env.local` :

- `NEXT_PUBLIC_SUPABASE_URL` — déjà indiqué dans l’exemple
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clé anon Supabase
- `CRON_SECRET` — chaîne aléatoire (obligatoire en production pour `/api/cron/scheduled`)

## Base Supabase

1. SQL Editor : exécuter `supabase/migrations/001_initial.sql`.
2. Si `alter publication supabase_realtime add table` échoue (table déjà publiée), ignorer l’erreur ou retirer cette ligne.
3. **Database → Replication** : confirmer que la table `alerts` est bien en réplication temps réel (Realtime).

## Développement

```bash
npm run dev
```

- [http://localhost:3000/display-screen](http://localhost:3000/display-screen) — écran
- [http://localhost:3000/admin](http://localhost:3000/admin) — admin (PIN : `1234`)

## Déploiement Vercel

1. Importer le dépôt, définir les variables d’environnement (dont `CRON_SECRET`).
2. Vercel envoie les crons avec l’en-tête `Authorization: Bearer <CRON_SECRET>` vers `/api/cron/scheduled` (voir `vercel.json`). **Plan Hobby** : au plus **une** exécution par jour — le projet utilise `0 0 * * *` (tous les jours à 00:00 **UTC**). Les messages planifiés ne partent qu’à l’heure correspondante à ce moment-là en Europe/Paris. Pour un déclenchement plus fréquent, passer en **Pro** ou appeler l’URL du cron via un service externe.
3. Les heures planifiées sont comparées en **Europe/Paris** ; le champ `days` est une liste `0`–`6` (dimanche–samedi), séparée par des virgules.

## Structure

- `src/app/display-screen` — messages + overlay d’alerte (Web Audio pour urgent)
- `src/app/admin` — PIN + envoi d’alerte + CRUD `scheduled_messages`
- `src/app/api/cron/scheduled` — déclenchement des messages planifiés
