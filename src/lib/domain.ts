// Domain parsing, normalization and validation.

import type { Price } from "./pricing";

/** A single availability result for one fully-qualified domain. */
export interface Availability {
  /** The normalized domain that was checked, e.g. "acme.io". */
  domain: string;
  /** The top-level domain, e.g. "io". */
  tld: string;
  /**
   * Whether the domain looks available to register.
   * `true` = looks available, `false` = taken, `null` = could not determine.
   */
  available: boolean | null;
  /** Where the answer came from. */
  source: "rdap" | "whois" | "dns" | "unknown";
  /**
   * How much to trust the answer:
   *   "authoritative" = from a registry (RDAP or WHOIS) — definitive.
   *   "heuristic"     = inferred from DNS, or undetermined — re-check before acting.
   */
  confidence: "authoritative" | "heuristic";
  /** Human-readable note about how we decided (rate-limited, no rdap server, etc). */
  note?: string;
  /** TLD base price, present only when pricing was requested. */
  price?: Price;
  /** ISO-8601 timestamp of when the check ran. */
  checkedAt: string;
}

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Normalize arbitrary user input into a bare domain.
 * Strips scheme, path, query, leading "www.", whitespace and lowercases.
 *   "https://WWW.Acme.io/pricing?x=1" -> "acme.io"
 */
export function normalizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // scheme://
  s = s.replace(/[/?#].*$/, ""); // path / query / fragment
  s = s.replace(/^www\./, "");
  s = s.replace(/\.$/, ""); // trailing dot (FQDN form)
  return s;
}

/** Normalize a search keyword (no TLD): strips everything but the leftmost label-ish part. */
export function normalizeKeyword(input: string): string {
  const s = normalizeDomain(input);
  // If the user typed a full domain as the keyword, keep just the second-level label.
  const parts = s.split(".");
  return parts.length > 1 ? parts.slice(0, -1).join(".") : s;
}

/** True if `domain` is a syntactically valid, registrable-looking domain. */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  return labels.every((l) => LABEL.test(l));
}

/** True if `label` is a valid single DNS label (used for keyword validation). */
export function isValidLabel(label: string): boolean {
  return LABEL.test(label);
}

/** Extract the TLD (last label) from a domain. */
export function tldOf(domain: string): string {
  const parts = domain.split(".");
  return parts[parts.length - 1] ?? "";
}
