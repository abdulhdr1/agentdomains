// Orchestrates a single-domain availability decision, most-authoritative first:
//   RDAP  (registry, JSON)        -> authoritative
//   WHOIS (registry, port 43)     -> authoritative, for TLDs with no RDAP
//   DNS   (delegation heuristic)  -> best-effort guess, last resort

import {
  type Availability,
  isValidDomain,
  normalizeDomain,
  tldOf,
} from "./domain";
import { dnsRegistered } from "./dns";
import { rdapLookup } from "./rdap";
import { whoisLookup } from "./whois";

/** Check whether a single fully-qualified domain looks available to register. */
export async function checkAvailability(input: string): Promise<Availability> {
  const domain = normalizeDomain(input);
  const tld = tldOf(domain);
  const checkedAt = new Date().toISOString();
  const base = { domain, tld, checkedAt };

  if (!isValidDomain(domain)) {
    return {
      ...base,
      available: null,
      source: "unknown",
      confidence: "heuristic",
      note: "not a valid domain name",
    };
  }

  // 1. RDAP — authoritative.
  const rdap = await rdapLookup(domain);
  if (rdap.registered !== null) {
    return { ...base, available: !rdap.registered, source: "rdap", confidence: "authoritative" };
  }

  // 2. WHOIS — authoritative, for TLDs RDAP couldn't serve.
  const whois = await whoisLookup(domain);
  if (whois.registered !== null) {
    return { ...base, available: !whois.registered, source: "whois", confidence: "authoritative" };
  }

  // 3. DNS — heuristic, last resort.
  const dns = await dnsRegistered(domain);
  if (dns !== null) {
    return {
      ...base,
      available: !dns,
      source: "dns",
      confidence: "heuristic",
      note: `${rdap.note}; ${whois.note}; used dns heuristic`,
    };
  }

  return {
    ...base,
    available: null,
    source: "unknown",
    confidence: "heuristic",
    note: [rdap.note, whois.note].filter(Boolean).join("; ") || "could not determine availability",
  };
}
