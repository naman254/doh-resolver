DoH Resolver — Dashboard

This is a minimal Next.js 14 (App Router) admin dashboard for the DoH Resolver project.

Environment variables required (set in Vercel):
- `DATABASE_URL` — Neon PostgreSQL URL (shared with resolver)
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — (not used here but resolver uses them)
- `DASHBOARD_PASSWORD` — password used to authenticate to the dashboard
- `IRON_SESSION_PASSWORD` — (recommended) secret for iron-session cookie encryption; falls back to `DASHBOARD_PASSWORD` if not set

Prisma notes:
- The dashboard includes a `prisma/schema.prisma` file that mirrors the resolver's `QueryLog` model and adds a `ThreatIntelligence` model.
- After installing deps, run `prisma generate` so the Prisma client is available to the app.

Install and run locally:

```bash
cd dashboard
npm install
npm run dev
```

Generate Prisma client after install:

```bash
cd dashboard
npx prisma generate
```
