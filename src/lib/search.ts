// Multi-TLD search: sweep one keyword across a set of TLDs, or check a single
// explicit domain. Runs lookups with bounded concurrency so we stay polite to
// registry RDAP servers.

import { type Availability, normalizeDomain, normalizeKeyword } from "./domain";
import { checkAvailability } from "./availability";
import { DEFAULT_TLDS } from "./tlds";

// Each TLD hits a different registry, so we can fan out fairly wide without
// hammering any one server — keeps the larger sweeps (e.g. ?tlds=all) snappy.
const CONCURRENCY = 12;

/** Either a single-domain check or a multi-TLD sweep. */
export type CheckResult = Availability | SearchResult;

/** Narrow a CheckResult to a multi-TLD SearchResult. */
export function isSearchResult(r: CheckResult): r is SearchResult {
  return "results" in r;
}

/**
 * Check input that may or may not include a TLD:
 *   "acme.io" -> single-domain availability
 *   "acme"    -> sweep across all `tlds` (defaults to DEFAULT_TLDS)
 */
export async function checkOrSearch(
  input: string,
  tlds: readonly string[] = DEFAULT_TLDS,
): Promise<CheckResult> {
  return normalizeDomain(input).includes(".")
    ? checkAvailability(input)
    : search(input, tlds);
}

export interface SearchResult {
  /** The keyword (or explicit domain) that was searched. */
  query: string;
  /** Every domain checked, in the order TLDs were requested. */
  results: Availability[];
  /** Just the domains that look available — the list an agent usually wants. */
  available: string[];
  checkedAt: string;
}

/**
 * Search a keyword across TLDs. If the query already contains a dot it's
 * treated as a single explicit domain and `tlds` is ignored.
 */
export async function search(
  query: string,
  tlds: readonly string[] = DEFAULT_TLDS,
): Promise<SearchResult> {
  const checkedAt = new Date().toISOString();
  const trimmed = query.trim();

  const domains = trimmed.includes(".")
    ? [normalizeDomain(trimmed)]
    : tlds.map((tld) => `${normalizeKeyword(trimmed)}.${tld}`);

  const results = await mapPool(domains, CONCURRENCY, checkAvailability);
  const available = results
    .filter((r) => r.available === true)
    .map((r) => r.domain);

  return { query: trimmed, results, available, checkedAt };
}

/** Run `fn` over `items` with at most `limit` concurrent calls, preserving order. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index] as T);
    }
  });

  await Promise.all(workers);
  return results;
}
