# agentdomains — launch kit

Assets and ready-to-paste copy for launching [agentdomains](https://agentdomains.abdulhdr1.workers.dev).

## Links

- **Live:** https://agentdomains.abdulhdr1.workers.dev
- **Repo:** https://github.com/abdulhdr1/agentdomains (MIT)
- **Built by:** [@abdulhdr](https://x.com/abdulhdr1)

## Assets

| File | Size | Use |
| --- | --- | --- |
| `launch.mp4` | 1280×720, has audio | **Primary** for Twitter/X — autoplays; keystroke SFX when unmuted |
| `launch.gif` | 1280×720, silent | Where video isn't supported (GIFs carry no audio) |
| `launch-muted.mp4` | 1280×720, silent | Silent master, if you want video without sound |
| `launch-card.png` | 2560×1440 | Static hero image / fallback |

The OG link-preview image (`/og.png`) and favicons live in `../public/` and are already wired into the site, so pasting the URL anywhere renders a card automatically.

> Note: the demo uses `acme.*` as an illustrative placeholder — not a real availability claim.

---

## Twitter / X

**Main post** (attach `launch.mp4`):

```
agentdomains — an API for AI agents to find available domains 🌐

• RDAP + WHOIS, authoritative, no API keys
• sweep a name across every TLD in one call
• MCP server so your agent checks domains itself
• terminal.shop-coded, runs on the edge

domains for agents, by agents.
https://agentdomains.abdulhdr1.workers.dev
```

**Thread** (optional follow-ups):

```
2/ how it works: RDAP first (the authoritative registry protocol), WHOIS for
ccTLDs that have no RDAP, DNS only as a last resort. every result is tagged
authoritative vs heuristic — so an agent never treats a guess as "free".
```

```
3/ built for agents: an MCP server exposes check_domain + search_domains, so
your agent can check availability itself. prefer HTTP? it's one GET. there's a
/llms.txt and /openapi.json so an agent can bootstrap from the URL alone.
```

```
4/ open source (MIT), no keys, no accounts. Bun + Hono on Cloudflare Workers.
code → https://github.com/abdulhdr1/agentdomains
```

**One-liner:**

```
an API for AI agents to find available domains. RDAP + WHOIS, no keys, MCP-ready.
https://agentdomains.abdulhdr1.workers.dev
```

---

## LinkedIn

```
I built agentdomains — a small open-source API that lets AI agents check domain
availability across TLDs in a single call.

It queries registries authoritatively over RDAP, falls back to WHOIS for ccTLDs
that don't support it, and a DNS heuristic only as a last resort — and every
result is labelled authoritative vs heuristic so an agent never mistakes a guess
for a free domain. No API keys, no accounts.

It ships an MCP server (so agents can call it directly), a JSON HTTP API, and a
CLI. Built on Bun + Hono, deployed to Cloudflare Workers, MIT-licensed.

Live: https://agentdomains.abdulhdr1.workers.dev
Code: https://github.com/abdulhdr1/agentdomains
```

---

## Hacker News (Show HN)

**Title:**

```
Show HN: Agentdomains – domain availability API for AI agents (RDAP+WHOIS, no keys)
```

**First comment:**

```
I kept wanting my agents to check whether a domain was free without signing up
for a registrar API. So I built agentdomains: one GET sweeps a name across TLDs
and returns clean JSON.

It uses RDAP (the JSON successor to WHOIS) as the authoritative source, falls
back to WHOIS over TCP for ccTLDs that lack RDAP, and a DNS heuristic only as a
last resort — results carry a confidence flag so "couldn't determine" is never
silently treated as available. No API keys.

There's an MCP server (check_domain / search_domains), a CLI, and machine-
readable discovery (/llms.txt, /openapi.json). Bun + Hono on Cloudflare Workers,
MIT. Happy to answer questions.

https://agentdomains.abdulhdr1.workers.dev
```

---

## Product Hunt

**Tagline:**

```
Domain availability for AI agents — RDAP + WHOIS, no API keys
```

**Description:**

```
agentdomains is an open-source API that tells AI agents which domains are still
available to register. Sweep a name across TLDs in one call, get authoritative
RDAP/WHOIS answers (with a confidence flag), optional pricing, and an MCP server
so agents can check domains themselves. No keys, no accounts. MIT.
```

---

## Boilerplate description

**Short (≤ 280 chars):**

```
agentdomains: an API for AI agents to find available domains. Authoritative
RDAP + WHOIS, a confidence flag on every result, multi-TLD sweep, an MCP server,
and a CLI. No API keys. Open source, on the edge.
```

**Paragraph:**

```
agentdomains is a small, keyless API for finding available domains — built for
AI agents. It checks registries authoritatively over RDAP, falls back to WHOIS
and then a DNS heuristic, and labels every result authoritative or heuristic. It
sweeps a keyword across 18 popular TLDs by default (or presets like all/startup/
tech/agent), can attach base pricing, and ships an MCP server, a CLI, and a
terminal-styled web UI. Bun + Hono on Cloudflare Workers. MIT.
```

---

## Posting tips

- **Post `launch.mp4`** (not the GIF) where you want sound — X autoplays muted, audio kicks in on unmute.
- **OG previews are cached** by each platform on first paste. If you change `og.png` later, re-scrape with the platform's card validator to refresh.
- Keystroke SFX in the video were synthesized with [@web-kits/audio](https://github.com/raphaelsalaja/audio) (MIT, Raphael Salaja) — a courteous credit if you mention the sound.
