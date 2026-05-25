// RDAP (Registration Data Access Protocol) availability lookups.
//
// RDAP is the modern, JSON-based successor to WHOIS. IANA publishes a
// "bootstrap" file mapping every TLD to its authoritative RDAP server, so we
// can ask the right registry directly — no API key, no rate-limit deals.
//
//   bootstrap: https://data.iana.org/rdap/dns.json
//   query:     GET {base}/domain/{name}  -> 404 = available, 200 = taken

import { tldOf } from "./domain";

const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const BOOTSTRAP_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const REQUEST_TIMEOUT_MS = 8000;
const USER_AGENT =
  "agentdomains/0.1 (+https://github.com/agentdomains; domain availability checker)";

interface IanaBootstrap {
  services: [string[], string[]][];
}

// Some registries run RDAP but never registered it in the IANA bootstrap, so
// the bootstrap map misses them. These overrides are consulted when the
// bootstrap has no entry — verified to return correct 200/404 results.
//   Identity Digital operates RDAP for the ICB ccTLDs (.io .sh .ac .tm).
const RDAP_OVERRIDES: Record<string, string> = {
  io: "https://rdap.identitydigital.services/rdap/",
  sh: "https://rdap.identitydigital.services/rdap/",
  ac: "https://rdap.identitydigital.services/rdap/",
  tm: "https://rdap.identitydigital.services/rdap/",
};

let bootstrap: { map: Map<string, string>; fetchedAt: number } | null = null;
let inflight: Promise<Map<string, string>> | null = null;

async function loadBootstrap(): Promise<Map<string, string>> {
  if (bootstrap && Date.now() - bootstrap.fetchedAt < BOOTSTRAP_TTL_MS) {
    return bootstrap.map;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch(BOOTSTRAP_URL, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`RDAP bootstrap fetch failed: ${res.status}`);
    const data = (await res.json()) as IanaBootstrap;

    const map = new Map<string, string>();
    for (const [tlds, urls] of data.services) {
      // Prefer an https endpoint; fall back to the first listed.
      const base = urls.find((u) => u.startsWith("https://")) ?? urls[0];
      if (!base) continue;
      for (const tld of tlds) map.set(tld.toLowerCase(), base.replace(/\/?$/, "/"));
    }
    bootstrap = { map, fetchedAt: Date.now() };
    return map;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export type RdapStatus =
  | { registered: true }
  | { registered: false }
  | { registered: null; note: string };

/**
 * Look up a single domain via its registry's RDAP server.
 * Returns `{ registered: null }` (with a note) when the TLD has no RDAP server
 * or the registry misbehaves — the caller can then fall back to DNS.
 */
export async function rdapLookup(domain: string): Promise<RdapStatus> {
  const tld = tldOf(domain);
  let base: string | undefined;
  try {
    base = (await loadBootstrap()).get(tld);
  } catch (err) {
    base = RDAP_OVERRIDES[tld];
    if (!base) return { registered: null, note: `rdap bootstrap unavailable: ${msg(err)}` };
  }
  base ??= RDAP_OVERRIDES[tld];
  if (!base) return { registered: null, note: `no rdap server for .${tld}` };

  const url = `${base}domain/${encodeURIComponent(domain)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rdap+json" },
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 404) return { registered: false };
    if (res.ok) return { registered: true };
    if (res.status === 429)
      return { registered: null, note: "rdap rate-limited (429)" };
    return { registered: null, note: `rdap http ${res.status}` };
  } catch (err) {
    return { registered: null, note: `rdap request failed: ${msg(err)}` };
  }
}

/** Whether we have an RDAP server for this TLD (bootstrap or override). */
export async function hasRdap(tld: string): Promise<boolean> {
  const t = tld.toLowerCase();
  if (t in RDAP_OVERRIDES) return true;
  try {
    return (await loadBootstrap()).has(t);
  } catch {
    return false;
  }
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
