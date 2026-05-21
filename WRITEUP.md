# Write-up

## What this is

A minimal LLM chat app: type a prompt, get a reply from Claude, see your past
conversations in a sidebar. The brief asked for a full-stack Remix + Node
application with a database, deployed to Cloudflare. I built that, with two
deliberate adjustments noted below.

## Stack choices

**React Router 7 instead of Remix v2.** Remix v2 was upstreamed into React
Router 7 in late 2024 and is now in maintenance. The current scaffold (`create-react-router --template remix-run/react-router-templates/cloudflare`) is the
direct successor — same `loader`/`action` model, same file conventions — so the
intent of the brief is preserved while avoiding a deprecated dependency.

**Cloudflare Workers (Pages-compatible) for hosting.** The brief mentioned
Cloudflare Pages. Workers is the runtime under both Pages and Workers
deployments, and the `wrangler deploy` flow used here ships to the same edge
network. The trade-off is the V8-isolate runtime, which constrains database
choice (no raw TCP) — handled below.

**Neon Postgres with the HTTP serverless driver.** A standard `pg` client
cannot run on Workers; Neon's HTTP driver can. Drizzle gives me typed queries
and SQL-first migrations without an ORM black box.

**Claude Haiku 4.5.** Cheap and fast for a chat interface; the model is set in
one place (`app/lib/llm.ts`).

## Architecture

```
Browser ── Form POST ──▶ Worker (action) ──▶ Neon (history)
                                     │
                                     └────▶ Anthropic API
                            then persist user+assistant turns
                            and redirect to /?c=<id>
```

Each visitor gets a signed `pl_sid` cookie on first request. Conversations are
scoped to that session id — there's no account model, but ownership is enforced
server-side before any read or write to an existing conversation.

The chat route (`app/routes/_index.tsx`) is a single page: loader fetches the
conversation list and the active conversation's messages; action validates the
prompt with Zod, loads prior turns, calls Claude with full context, persists
both turns in one insert, and redirects. The redirect-after-action pattern
means refresh is safe and the URL is the source of truth for which conversation
is open.

## Assumptions and trade-offs

- **No accounts.** A signed cookie session is sufficient for a take-home and
  removes the auth surface. JWT was listed as optional; I opted out in favour
  of finishing the rest cleanly.
- **No streaming.** Full responses arrive at once. Streaming over SSE is a
  natural next step but adds complexity that doesn't change the architecture.
- **Multi-turn history is sent verbatim to the model.** Fine at this scale;
  a real product would need a token-budget strategy (sliding window or
  summarisation) once conversations grow long.
- **API keys.** The deployed Worker has a working Anthropic key set as a
  Cloudflare secret so reviewers can try the app without provisioning their
  own. A "Use your own API key" toggle in the prompt bar takes precedence
  when set — that value is kept in `sessionStorage`, posted as a hidden form
  field, and never logged or persisted server-side. All keys and the Neon
  database will be rotated/decommissioned once this take-home is reviewed.
- **Rate limiting** is intentionally not implemented locally — production would
  use Cloudflare's built-in rate limiting binding or a Durable Object, not
  in-memory state in a stateless Worker.

## Quality bar

- Strict TypeScript across the board, Zod validation at the request boundary,
  typed errors (`LLMError`) rather than `catch (e: any)`.
- Vitest covers the validation and the LLM wrapper (including SDK error
  mapping and empty-response handling).
- GitHub Actions runs typecheck and tests on every push; deploys on `main`.
- Drizzle migrations are checked into `drizzle/` so the schema is reproducible.
