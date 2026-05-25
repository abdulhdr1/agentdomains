# AGENTS.md

Guidance for coding agents working on **agentdomains** — an API that tells
agents which domains are available to register.

## What this is

A small Bun + Hono service with three surfaces over one core library:

- **HTTP API** (`src/server.ts`) — `/v1/check`, `/v1/search`, plus agent
  navigation routes (`/`, `/llms.txt`, `/openapi.json`).
- **MCP server** (`src/mcp.ts`) — stdio tools `check_domain`, `search_domains`.
- **CLI** (`src/cli.ts`) — `check` / `search`, talks to the lib directly.

Availability comes from **RDAP** (authoritative, via IANA bootstrap) with a
**DNS-over-HTTPS** fallback for TLDs that have no RDAP server (e.g. `.io`).

## Commands

```sh
bun install
bun run dev          # local API on :8787 (hot reload)
bun run cli search acme --tlds com,io,ai
bun run mcp          # MCP server on stdio
bun run typecheck    # tsc --noEmit — must stay clean
bun run cf:dev       # run the Worker build locally on workerd
bun run deploy       # wrangler deploy to Cloudflare
```

## Layout

```
src/
  index.ts        Bun entrypoint (serves the Hono app)
  worker.ts       Cloudflare Workers entrypoint (re-exports the app)
  server.ts       HTTP routes
  mcp.ts          MCP server
  cli.ts          CLI
  lib/
    domain.ts        normalize / validate / the Availability type
    rdap.ts          IANA bootstrap + RDAP lookups
    dns.ts           DNS-over-HTTPS fallback heuristic
    whois.ts         WHOIS over TCP:43 (cloudflare:sockets / node:net)
    pricing.ts       TLD base price from the bundled snapshot
    availability.ts  checkAvailability(): RDAP -> WHOIS -> DNS for one domain
  data/
    prices.json   bundled Porkbun price snapshot (refresh: bun run update-prices)
    search.ts        search() + checkOrSearch() + concurrency pool
    tlds.ts          DEFAULT_TLDS + parseTlds()
    format.ts        ASCII / ANSI renderers (shared by API ?format=text and CLI)
  ui/
    landing.ts    terminal-styled HTML docs page
    discovery.ts  discovery JSON, llms.txt, OpenAPI spec
```

## Conventions & invariants

- **`available` is `boolean | null`.** `null` means "couldn't determine" (rate
  limit, no RDAP server). Never collapse `null` into `false`/available — agents
  treat it as "re-check".
- **No `node:*` in the request path** (one controlled exception). The HTTP path
  must run on Cloudflare Workers, so prefer web-standard `fetch` / `AbortSignal`
  / `URL`. DNS goes over DoH (`src/lib/dns.ts`) for this reason — don't switch it
  back to `node:dns`. The sole exception is `src/lib/whois.ts`, which needs raw
  TCP:43: it uses `cloudflare:sockets` on Workers and `node:net` on Bun, picked
  at runtime. The `node:net` import uses a *computed* specifier so the Workers
  bundler leaves it external and never resolves it — keep it that way (don't make
  it a literal import) or the deploy will pull `node:net` into the bundle.
- **`checkOrSearch(input)`** is the entry that routes a bare keyword (no dot) to
  a multi-TLD sweep and a full domain to a single check. Use it for any
  "check" surface so behavior stays consistent across API / MCP / CLI.
- The three docs surfaces in `discovery.ts` are **origin-parameterized** — keep
  them returning absolute URLs derived from the request, not hardcoded.
- **Pricing is a bundled snapshot, not live.** Porkbun's API blocks Cloudflare
  Worker egress, so `pricing.ts` reads `src/data/prices.json` (compiled into the
  bundle) — do not reintroduce a per-request fetch (it times out on the edge).
  It's the TLD *base* price; never present it as the exact/premium price.
- Keep `bun run typecheck` clean. `tsconfig` has `strict` +
  `noUncheckedIndexedAccess`.

## When you add an endpoint

Update all of: the route in `server.ts`, the OpenAPI spec + discovery doc +
llms.txt in `ui/discovery.ts`, the landing page in `ui/landing.ts`, and (if it's
agent-relevant) a tool in `mcp.ts`.

## Deploy

`bun run deploy` → Cloudflare Workers (`wrangler.toml`, name `agentdomains`).
Live at https://agentdomains.abdulhdr1.workers.dev. No `nodejs_compat` flag —
keep it that way by honoring the "no `node:*`" invariant above.
