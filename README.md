# Leads System

A leads management app built with Next.js (App Router), NextAuth (credentials login),
and SQLite (via better-sqlite3). Two roles:

- **Owner** — sees all leads, uploads bulk leads via .xlsx/.csv, assigns leads to reps,
  manages the team, exports leads to .xlsx.
- **Rep** — sees only leads assigned to them, updates status, adds notes/tags.

## What was already built (previous session)

- `lib/auth.ts`, `lib/auth.config.ts` — data layer + auth (see "Bug fixed" below for
  why this is split into two files)
- `middleware.ts` — role-based route protection for `/owner` and `/rep`
- All API routes under `app/api/**`
- `tailwind.config.ts`, `app/globals.css` — design tokens/styles

## What this session added (the missing frontend + project scaffolding)

- `package.json`, `next.config.js`, `tsconfig.json`, `postcss.config.js`
- `app/layout.tsx`, `app/page.tsx` (role-based redirect), `components/Providers.tsx`
- `/login` and `/signup` pages
- `/owner` — dashboard with stats + leads table (`app/owner/page.tsx`)
- `/owner/leads/[id]` — lead detail (notes, tags, status, assignment)
- `/owner/upload` — bulk import UI
- `/owner/team` — activate/deactivate reps
- `/rep` — "My leads" table (server-filtered to the signed-in rep)
- `/rep/leads/[id]` — lead detail (notes, tags, status; no assignment control)
- `app/api/auth/[...nextauth]/route.ts` — the NextAuth handler the rest of the app calls into
- Shared components: `Sidebar`, `StatusBadge`, `LeadsTable`, `LeadDetail`

## Bugs fixed from the previous session

1. **Next.js CVE.** `package.json` originally pinned `next@14.2.5`, which has a
   critical Dec 2025 RSC vulnerability (CVE-2025-55183/55184/67779). Bumped to the
   patched `14.2.35`.
2. **Middleware imported the database into the Edge runtime.** The original
   `middleware.ts` called `auth()` from `lib/auth.ts`, which imports `better-sqlite3`
   — a native Node addon. Middleware runs in the Edge runtime and can't load native
   modules, so this built fine but would crash the moment a request hit it. Fixed by
   splitting the NextAuth config into `lib/auth.config.ts` (no providers, no DB
   access — safe for Edge) and `lib/auth.ts` (adds the Credentials provider with the
   real `authorize()` that touches the database, used everywhere except middleware).
   `middleware.ts` now builds its own lightweight `auth()` from `authConfig` only.

This was verified end-to-end with a production build (`next build`) and a running
server: signup, login, session cookie, and role-based redirects on `/owner` and
`/rep` all confirmed working.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then edit NEXTAUTH_SECRET to a random string
npm run dev
```

Visit http://localhost:3000 — you'll land on `/login`. Click "Create one" to sign up.
The first account you create should use the **Owner** role so you have someone to
assign leads to reps. Reps sign themselves up with the **Sales rep** role afterward.

The SQLite database file `leads.db` is created automatically in the project root on
first run — no separate DB setup needed.

## Notes / things you may want to tighten up next

- Signup is open to anyone and lets people self-select "Owner" — fine for an internal
  tool, but you'll want to lock that down (e.g. invite-only, or restrict Owner signup)
  before using this with real customers.
- `NEXTAUTH_SECRET` defaults to a hardcoded dev value if you don't set it — make sure
  `.env.local` is set before deploying anywhere.
- No pagination on the leads table yet; fine for a few hundred leads, worth adding for
  more.
