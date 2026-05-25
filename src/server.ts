// The HTTP API. Hono app, runtime-agnostic (Bun serves it from index.ts,
// Cloudflare Workers from worker.ts).

import { Hono } from "hono";
import { checkOrSearch, isSearchResult, search } from "./lib/search";
import { parseTlds } from "./lib/tlds";
import { attachPricing } from "./lib/pricing";
import { formatAvailability, formatSearch } from "./lib/format";
import { landingPage } from "./ui/landing";
import { discoveryDoc, llmsTxt, openApiSpec } from "./ui/discovery";

export const app = new Hono();

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
  const result = await checkOrSearch(domain, tlds);
  if (c.req.query("pricing") === "true") {
    await attachPricing(isSearchResult(result) ? result.results : [result]);
  }
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
  const result = await search(q, tlds);
  if (c.req.query("pricing") === "true") {
    await attachPricing(result.results);
  }
  if (c.req.query("format") === "text") {
    return text(formatSearch(result));
  }
  return c.json(result);
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
