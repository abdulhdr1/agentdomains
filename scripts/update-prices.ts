#!/usr/bin/env bun
// Refresh the bundled TLD price snapshot from Porkbun's public pricing endpoint.
//
//   bun run update-prices
//
// Run this from a network that can reach Porkbun (not the Cloudflare edge,
// which Porkbun blocks). Commit the resulting src/data/prices.json.

const URL = "https://api.porkbun.com/api/json/v3/pricing/get";

interface PorkbunResponse {
  status: string;
  pricing?: Record<string, { registration: string; renewal: string; transfer: string }>;
}

const res = await fetch(URL, {
  // Porkbun rejects requests with no User-Agent.
  headers: { "User-Agent": "agentdomains/0.1 (+https://github.com/agentdomains)", Accept: "application/json" },
  signal: AbortSignal.timeout(20000),
});
if (!res.ok) throw new Error(`porkbun http ${res.status}`);

const data = (await res.json()) as PorkbunResponse;
if (data.status !== "SUCCESS" || !data.pricing) {
  throw new Error(`porkbun status ${data.status}`);
}

const pricing: Record<string, { registration: number; renewal: number; transfer: number }> = {};
for (const [tld, p] of Object.entries(data.pricing)) {
  const registration = Number(p.registration);
  if (!Number.isFinite(registration)) continue;
  pricing[tld.toLowerCase()] = {
    registration: round(registration),
    renewal: round(Number(p.renewal)),
    transfer: round(Number(p.transfer)),
  };
}

const snapshot = {
  asOf: new Date().toISOString().slice(0, 10),
  currency: "USD",
  source: "porkbun",
  pricing: Object.fromEntries(Object.entries(pricing).sort(([a], [b]) => a.localeCompare(b))),
};

const out = `${import.meta.dir}/../src/data/prices.json`;
await Bun.write(out, JSON.stringify(snapshot));
console.log(`wrote ${out}: ${Object.keys(pricing).length} TLDs, asOf ${snapshot.asOf}`);

function round(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
