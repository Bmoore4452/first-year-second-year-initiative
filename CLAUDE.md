# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

An interest/needs-survey form for Clark Atlanta University's First Year / Second Year Mentorship Initiative. npm workspaces monorepo:

- `client/` — React 19 + Vite + TypeScript single-page form
- `server/` — Express 5 API that validates submissions and writes them to Supabase
- `supabase/` — Postgres schema migrations (Supabase CLI layout)

## Commands

Run from the repo root unless noted:

```bash
npm install                 # installs both workspaces
npm run dev                 # API (tsx watch, :4000) + client (Vite, :5173) together
npm run build               # tsc for server, then tsc -b && vite build for client
npm run lint -w client      # oxlint (client only; server has no linter)
npm run dev -w server       # run just one side
npm run start -w server     # run compiled server from dist/
```

There is no test suite. Type-checking happens via the build scripts.

Local setup needs `server/.env` (copy `server/.env.example`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS`, `PORT`) and `client/.env` (`VITE_API_URL`, defaults to `http://localhost:4000`; `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` for the dashboard). The form is at http://localhost:5173/ and the dashboard at http://localhost:5173/admin/.

## Architecture

**Data flow:** `App.tsx` form state → `client/src/api.ts` `submitResponse()` POSTs JSON to `${VITE_API_URL}/api/responses` → `server/src/app.ts` validates with a Zod schema → inserts into `public.responses` with the service-role key. The form never talks to Supabase directly. RLS on `responses` allows no inserts from the anon key, so writes only go through the API.

**Adding or changing a form field touches five places that must stay in sync:**
1. `ResponsePayload` in `client/src/api.ts` (camelCase)
2. Form state/UI in `client/src/App.tsx`
3. `responseSchema` and the camelCase → snake_case insert mapping in `server/src/app.ts`
4. A new migration in `supabase/migrations/` (snake_case columns) — don't edit existing migrations
5. `ResponseRow` in `client/src/supabase.ts`, plus the dashboard table and CSV columns in `client/src/admin/`

**Checkbox options** live in `client/src/options.ts`. The server does not validate against these lists — it accepts any string array (≤50 items, ≤100 chars each), because each checkbox group has an "Other" free-text option whose trimmed text is appended into the same array on submit.

**Server entry points:** `src/app.ts` builds and exports the Express app (and parses env with Zod at import time — missing Supabase vars throw on startup). `src/index.ts` is the local `app.listen` entry; `api/index.ts` re-exports the app as a Vercel serverless function, and `server/vercel.json` rewrites all paths to it. Server is ESM, so relative imports use `.js` extensions.

**Organizer dashboard (`/admin/`):** a second Vite page (`client/admin/index.html` → `client/src/admin/`, registered in `vite.config.ts` `build.rolldownOptions.input`). Unlike the form, it talks to Supabase directly with the anon key (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and Supabase Auth email/password sign-in. Access is enforced by RLS, not the UI: `public.admins` is an email allow-list, and the `admins can read responses` policy grants SELECT only to signed-in users whose JWT email is in it. The dashboard is read-only (no update/delete policies). Admin users are created by hand in Supabase Auth, and public sign-ups should stay disabled. To add or remove an organizer, change both `public.admins` and the Auth user. CSV export (`src/admin/csv.ts`) exports only the currently filtered rows and prefixes values that start with `=+-@`, so spreadsheet apps treat them as text instead of formulas.

## Deployment

Client and server deploy as two separate Vercel projects via the Vercel CLI. Pushing to git does not deploy them. Each subdirectory is linked through its own `.vercel/project.json`:

```bash
vercel --prod --cwd client   # form + /admin/ dashboard → first-year-second-year-form (https://first-year-second-year-form.vercel.app)
vercel --prod --cwd server   # API → first-year-second-year-api
```

Never run `vercel` from the repo root. It isn't linked, so Vercel creates a new project there and the build fails, because the root has no output directory.

The server's `CORS_ORIGINS` must include the deployed client origin, and the client's `VITE_API_URL` must point at the deployed API at build time. `VITE_BASE` in `vite.config.ts` is a leftover from GitHub Pages hosting and is normally unset.
