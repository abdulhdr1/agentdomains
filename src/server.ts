// The HTTP API. Hono app, runtime-agnostic (Bun serves it from index.ts,
// Cloudflare Workers from worker.ts).

import { Hono } from "hono";
import { checkOrSearch, isSearchResult, search } from "./lib/search";
import { parseTlds } from "./lib/tlds";
import { attachPricing } from "./lib/pricing";
import { formatAvailability, formatSearch } from "./lib/format";
import { landingPage } from "./ui/landing";
import { discoveryDoc, llmsTxt, openApiSpec } from "./ui/discovery";
import { readStats, track } from "./lib/analytics";

export const app = new Hono<{ Bindings: Env }>();

const countryOf = (c: { req: { raw: Request } }): string | null =>
  ((c.req.raw as { cf?: { country?: string } }).cf?.country ?? null);

const text = (s: string, contentType = "text/plain; charset=utf-8") =>
  new Response(s + "\n", { headers: { "content-type": contentType } });

const originOf = (url: string) => {
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
};

/** True when the client clearly prefers JSON over HTML (e.g. an agent / curl). */
const wantsJson = (accept: string | undefined) =>
  !!accept && accept.includes("application/json") && !accept.includes("text/html");

// Root: HTML for browsers, a machine-readable discovery doc for agents.
app.get("/", (c) => {
  const origin = originOf(c.req.url);
  if (wantsJson(c.req.header("accept"))) return c.json(discoveryDoc(origin));
  return c.html(landingPage(origin));
});

app.get("/health", (c) => c.json({ ok: true }));

// Agent navigation surfaces.
app.get("/llms.txt", (c) => text(llmsTxt(originOf(c.req.url)), "text/markdown; charset=utf-8"));
app.get("/openapi.json", (c) => c.json(openApiSpec(originOf(c.req.url))));

// GET /v1/check?domain=acme.io  -> single domain
// GET /v1/check?domain=acme     -> no TLD, so sweep all TLDs (optionally ?tlds=)
app.get("/v1/check", async (c) => {
  const domain = c.req.query("domain");
  if (!domain) {
    return c.json({ error: "missing ?domain= parameter" }, 400);
  }
  const tlds = parseTlds(c.req.query("tlds"));
  const pricing = c.req.query("pricing") === "true";
  const result = await checkOrSearch(domain, tlds);
  if (pricing) {
    await attachPricing(isSearchResult(result) ? result.results : [result]);
  }
  track(c.env, { endpoint: "/v1/check", result, pricing, country: countryOf(c) });
  if (c.req.query("format") === "text") {
    return text(isSearchResult(result) ? formatSearch(result) : formatAvailability(result));
  }
  return c.json(result);
});

// GET /v1/search?q=acme[&tlds=com,io,ai][&format=text]
app.get("/v1/search", async (c) => {
  const q = c.req.query("q");
  if (!q) {
    return c.json({ error: "missing ?q= parameter" }, 400);
  }
  const tlds = parseTlds(c.req.query("tlds"));
  const pricing = c.req.query("pricing") === "true";
  const result = await search(q, tlds);
  if (pricing) {
    await attachPricing(result.results);
  }
  track(c.env, { endpoint: "/v1/search", result, pricing, country: countryOf(c) });
  if (c.req.query("format") === "text") {
    return text(formatSearch(result));
  }
  return c.json(result);
});

// Aggregated usage, read back from Analytics Engine. Returns guidance until the
// read-only token (CF_ACCOUNT_ID + CF_API_TOKEN) is configured.
app.get("/stats", async (c) => {
  const days = Math.min(Math.max(Number(c.req.query("days") ?? 7), 1), 90);
  return c.json(await readStats(c.env, days));
});

app.notFound((c) =>
  c.json(
    {
      error: "not found",
      routes: ["/v1/check", "/v1/search", "/health", "/openapi.json", "/llms.txt"],
      discovery: `${originOf(c.req.url)}/ (Accept: application/json)`,
    },
    404,
  ),
);
