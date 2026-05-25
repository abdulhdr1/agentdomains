# agentdomains

> domains for agents, by agents. no dashboards. no keys. just a name.

A tiny HTTP API (plus an MCP server and a CLI) that tells your agents which
domains are still available to register. It asks the actual registries over
[RDAP](https://about.rdap.org/) — the JSON protocol that replaced WHOIS — and
falls back to a DNS heuristic when a registry has no RDAP server or stays quiet.

No API keys. No accounts. Built on [Bun](https://bun.sh) + [Hono](https://hono.dev).

```
 ▄▀█ █▀▀ █▀▀ █▄░█ ▀█▀   █▀▄ █▀█ █▀▄▀█ ▄▀█ █ █▄░█ █▀
 █▀█ █▄█ ██▄ █░▀█ ░█░   █▄▀ █▄█ █░▀░█ █▀█ █ █░▀█ ▄█
```

## quickstart

```sh
bun install
bun run dev          # http://localhost:8787
```

Open the root URL in a browser for the terminal-styled docs page.

## the API

| route        | params                                   | what                        |
| ------------ | ---------------------------------------- | --------------------------- |
| `GET /v1/check`  | `domain` `[format=text]`             | availability of one domain  |
| `GET /v1/search` | `q` `[tlds=com,io,ai\|all\|startup\|tech\|agent]` `[format=text]` | sweep a keyword across TLDs |
| `GET /health`    | —                                    | liveness                    |

```sh
curl 'http://localhost:8787/v1/check?domain=acme.io'
curl 'http://localhost:8787/v1/search?q=acme&tlds=com,io,ai'
curl 'http://localhost:8787/v1/search?q=acme&tlds=all'           # ~36 TLDs (or startup/tech/agent)
curl 'http://localhost:8787/v1/search?q=acme&format=text'        # pretty ASCII
curl 'http://localhost:8787/v1/search?q=acme&pricing=true'       # + TLD base price
```

`available` is `true` / `false` / `null`. **null** means we couldn't get a
straight answer (rate limit, no RDAP/WHOIS server) — treat it as "check again",
not "free". `confidence` is `authoritative` (RDAP or WHOIS) or `heuristic` (DNS).

### availability sources

Most-authoritative first: **RDAP** (registry JSON; covers gTLDs and, via
overrides, ccTLDs like `.io`/`.sh`) → **WHOIS** (registry port 43, for TLDs with
no RDAP, e.g. `.co`/`.de`) → **DNS** heuristic (last resort; `confidence:
heuristic`). WHOIS uses `cloudflare:sockets` on Workers and `node:net` locally.

### pricing

`?pricing=true` attaches a `price` object (USD) to each **available** domain
from a bundled Porkbun snapshot. This is the **TLD base price** — registry-
premium names (short, dictionary) can cost far more, which a keyless source
can't see. Exact per-name pricing needs a registrar API key. Refresh the
snapshot with `bun run update-prices`.

## MCP (plug it into an agent)

Two tools over stdio: `check_domain` and `search_domains`.

```jsonc
{
  "mcpServers": {
    "agentdomains": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/agentdomains/src/mcp.ts"]
    }
  }
}
```

## CLI

```sh
bun run cli check  acme.io
bun run cli search acme --tlds com,io,ai
bun run cli search acme --json
```

The CLI talks to the core library directly, so it works without the server running.

## layout

```
src/
  index.ts        Bun entrypoint (serves the Hono app)
  server.ts       HTTP routes
  mcp.ts          MCP server (stdio)
  cli.ts          CLI client
  lib/
    domain.ts        normalize / validate / types
    rdap.ts          IANA bootstrap + RDAP lookups
    dns.ts           DNS fallback heuristic
    availability.ts  RDAP-then-DNS orchestration
    search.ts        multi-TLD sweep (bounded concurrency)
    tlds.ts          default TLD set + parsing
    format.ts        ASCII / ANSI renderers
  ui/
    landing.ts    terminal-styled docs page
```

## notes

- Availability is best-effort, not a guarantee — a registrar may still reject a
  registration. This is a fun project, not a registrar.
- RDAP coverage is excellent for gTLDs (.com, .io, .ai, .dev, …) and many
  ccTLDs. Where it's missing, results come from DNS and are marked `source: "dns"`.

MIT.
