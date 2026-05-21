# HyperDev

A small full-stack chat app that talks to Claude and keeps a history of past
conversations per visitor. Built on React Router (the framework formerly known
as Remix), deployed to Cloudflare Workers, backed by Neon Postgres.

> **For reviewers:** the deployed app at
> https://hyperdev.dieumercikaz.workers.dev is wired up with a working
> Anthropic API key so you can try it without provisioning your own. There is
> also a "Use your own API key" toggle in the prompt bar if you'd prefer. The
> embedded keys and database will be rotated/decommissioned after this
> take-home is reviewed.

## Stack

- React Router 7 (framework mode) + React 19 + TypeScript
- Cloudflare Workers runtime
- Neon serverless Postgres + Drizzle ORM
- Anthropic SDK (Claude Haiku 4.5)
- Tailwind 4, Zod, Vitest

## Running locally

You'll need Node 22+ and a Neon database (free tier is fine).

```sh
cp .dev.vars.example .dev.vars
# Fill in DATABASE_URL, ANTHROPIC_API_KEY, SESSION_SECRET
npm install
npm run db:migrate
npm run dev
```

Visit `http://localhost:5173`. If you'd rather not use the server's API key,
click "Use your own API key" in the input bar and paste your own — it's kept in
`sessionStorage` and sent with each request, never persisted server-side.

## Useful scripts

| Script               | What it does                          |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Local dev server with HMR             |
| `npm test`           | Vitest (watch); `-- --run` for CI     |
| `npm run typecheck`  | Wrangler typegen + `tsc -b`           |
| `npm run db:generate`| Generate a new migration from schema  |
| `npm run db:migrate` | Apply pending migrations              |
| `npm run build`      | Production build                      |
| `npm run deploy`     | Build and deploy via Wrangler         |

## Deploying

1. Create a Neon project and a Cloudflare account.
2. Set Workers secrets:
   ```sh
   wrangler secret put DATABASE_URL
   wrangler secret put ANTHROPIC_API_KEY
   wrangler secret put SESSION_SECRET
   ```
3. `npm run deploy`.

CI (see `.github/workflows/ci.yml`) runs typecheck and tests on every push, and
deploys on push to `main` when `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` are configured as repository secrets.

## Layout

```
app/
  lib/         db client, llm wrapper, validation, session cookie
  components/  small UI pieces
  routes/      index route with loader + action
workers/       Cloudflare entry
drizzle/       generated SQL migrations
```
