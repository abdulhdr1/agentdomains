// DNS-based availability heuristic, used as a fallback when a TLD has no RDAP
// server (e.g. some ccTLDs). This is a *heuristic*: a domain can be registered
// but have no DNS records, so absence of records only suggests availability.
//
// Implemented over DNS-over-HTTPS (RFC 8484 JSON form) so it runs identically
// on Bun, Node and Cloudflare Workers — none of which can do raw DNS from
// `node:dns` in a Worker. We query Cloudflare's 1.1.1.1 resolver.

const DOH_URL = "https://cloudflare-dns.com/dns-query";
const TIMEOUT_MS = 6000;

// DNS record type numbers.
const TYPE_NS = 2;
const TYPE_SOA = 6;

// DNS response codes (RCODE).
const RCODE_NOERROR = 0;
const RCODE_NXDOMAIN = 3;

interface DohAnswer {
  type: number;
}
interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
  Authority?: DohAnswer[];
}

async function query(name: string, type: "NS" | "SOA"): Promise<DohResponse | null> {
  const url = `${DOH_URL}?name=${encodeURIComponent(name)}&type=${type}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as DohResponse;
  } catch {
    return null;
  }
}

function hasRecord(r: DohResponse, type: number): boolean {
  return (
    (r.Answer?.some((a) => a.type === type) ?? false) ||
    (r.Authority?.some((a) => a.type === type) ?? false)
  );
}

/**
 * Heuristic registration check via authoritative DNS records.
 *   true  = NS/SOA records exist -> definitely registered
 *   false = NXDOMAIN -> probably available
 *   null  = transient/ambiguous DNS error -> unknown
 */
export async function dnsRegistered(domain: string): Promise<boolean | null> {
  // A registered domain almost always has NS records at the registry.
  const ns = await query(domain, "NS");
  if (ns) {
    if (ns.Status === RCODE_NXDOMAIN) return false;
    if (hasRecord(ns, TYPE_NS)) return true;
  }

  // No NS in the answer — confirm with SOA before deciding.
  const soa = await query(domain, "SOA");
  if (soa) {
    if (soa.Status === RCODE_NXDOMAIN) return false;
    if (hasRecord(soa, TYPE_SOA)) return true;
    // NOERROR with no records and not NXDOMAIN is genuinely ambiguous.
    if (soa.Status === RCODE_NOERROR && !ns) return null;
  }

  return null;
}
