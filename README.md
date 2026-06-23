# vegan eating 🥕

A custom, plant-based recipe **community** platform — built from scratch to be faster, friendlier and more useful than a basic WordPress recipe blog.

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Anthropic SDK (for the AI tools).

---

## What's in this starter

A fully working front end with the green "vegan eating" design, real routing, sample recipe data, recipe pages with SEO schema, and one live AI feature ("Veganize any recipe"). The heavier platform pieces (database, accounts, forum, CMS) are stubbed with a clear roadmap below — this is the foundation they bolt onto.

| Route | What it is |
|-------|------------|
| `/` | Home — hero, promise strip, recipe grid, collections, forum preview, contributors |
| `/recipes` | Recipe index (filter chips ready to wire up) |
| `/recipes/[slug]` | Recipe page — ingredients, method, Cook Mode button, community notes, Recipe JSON-LD schema |
| `/forum` | Community forum (preview — to be powered by Discourse) |
| `/submit` | Submit-a-recipe form (preview of the contributor dashboard) |
| `/tools/veganize` | **Working AI tool** — paste a recipe, get a vegan version |
| `/api/veganize` | API route calling the Anthropic SDK |

---

## Prerequisites (WSL)

You're on Windows using WSL, so do everything **inside your WSL (Ubuntu) terminal**, not Windows PowerShell. Node should be installed in WSL.

1. Open Ubuntu (WSL). Check Node:
   ```bash
   node -v
   ```
   You want Node 18.18+ or 20+. If it's missing or old, install it with nvm:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   # restart the terminal, then:
   nvm install 20
   nvm use 20
   ```

2. Keep the project **inside the Linux filesystem** (e.g. `~/projects/`), not under `/mnt/c/...`. It's far faster and avoids file-watcher issues.

---

## Setup & run

```bash
# 1. Unzip / move the project into your WSL home, then enter it
cd ~/projects/vegan-eating

# 2. Install dependencies
npm install

# 3. (Optional, for the AI tool) add your key
cp .env.example .env.local
#    then edit .env.local and paste your ANTHROPIC_API_KEY from
#    https://console.anthropic.com

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000** in your browser. Edits hot-reload.

To check a production build:
```bash
npm run build
npm run start
```

To run after updating from home to dev or vice versa:
```bash
unset DATABASE_URL
npx prisma db push
rm -rf node_modules/.prisma && npx prisma generate
rm -rf .next
npm run build
npm run dev
```

kill all instances
```bash
# 1) Kill every running Next process — dev server and its workers
pkill -f "next dev"; pkill -f "next-server"
# if something's still holding port 3000:
lsof -ti:3000 | xargs -r kill -9

# 2) Make sure your local Postgres container is up (prisma needs a live DB)
docker compose down
docker compose up -d

# 3) Apply the schema (adds the 4 AI-image columns) and regenerate the client
npx prisma db push
npx prisma generate
echo $DATABASE_URL

rm -rf .next tsconfig.tsbuildinfo && npm run build
npm run dev
```

---

## Opening it in WebStorm

1. **File → Open** and select the `vegan-eating` folder.
2. Point WebStorm at your WSL Node so it runs through Linux:
   **Settings → Languages & Frameworks → Node.js** → Node interpreter → **Add → WSL** → pick your distro and the Node path (`which node` in WSL shows it).
3. Easiest run: open the built-in **Terminal** tab (it'll be a WSL shell) and run `npm run dev`.
   Or create a **Run Configuration**: Run → Edit Configurations → **+ → npm**, set `command: run`, `scripts: dev`.
4. WebStorm picks up the TypeScript + Tailwind config automatically.

> If hot-reload feels slow, confirm the project lives under the Linux home (`~/...`), not `/mnt/c/...`.

---

## Project structure

```
src/
  app/
    layout.tsx            # shell: fonts, header, footer
    page.tsx              # home page
    globals.css           # the full design system (ported from the concept)
    recipes/page.tsx      # recipe index
    recipes/[slug]/page.tsx  # recipe detail + JSON-LD schema
    forum/ submit/ tools/veganize/   # pages
    api/veganize/route.ts # AI endpoint
  components/             # Header, Sections, HomeSections, RecipeCard, VeganizeTool, ...
  data/
    recipes.ts            # sample recipes (replace with your DB / WP import)
    site.ts               # nav, stats, collections, contributors, threads
```

Swap the gradient placeholders (`.ph` blocks) for real photos when you have them, and replace the `data/` files with real data sources as you build out the roadmap.

---

## Roadmap — turning this into the full platform

These are the next layers, roughly in order. Each is additive.

1. **Database + recipes** — add PostgreSQL with Prisma. Migrate `data/recipes.ts` into a `Recipe` table, then write an import script for your WordPress CSV (we can map its columns and even auto-tag diet/allergens/protein with AI on import).
2. **Accounts** — NextAuth (Auth.js) for sign-up/login, saved recipes, ratings, and forum identity.
3. **Contributor / staff dashboard (CMS)** — a headless CMS such as **Payload** (runs inside Next.js) for structured recipe entry, roles, and draft → review → publish.
4. **Forum** — stand up **Discourse** and connect it with single sign-on so accounts are shared. (Building a forum from scratch is a large project; Discourse is the pragmatic win.)
5. **Search** — Meilisearch or Typesense for instant, typo-tolerant, faceted search (diet / time / protein / ingredient).
6. **Cook Mode** — wire the button to a full-screen stepper using the Wake Lock API, with timers and optional voice control.
7. **PWA** — installable app, offline access to saved recipes, push notifications.
8. **Deploy** — Vercel is the fastest path for Next.js; the database goes on Neon/Supabase/Railway, Discourse on its own host.

---

## Notes

- The AI tool needs `ANTHROPIC_API_KEY` in `.env.local`. Without it, the page loads but returns a friendly error.
- AI-generated nutrition/allergen info should always be shown as an estimate.
- Use real food photography rather than AI-generated images — it reads far better.
