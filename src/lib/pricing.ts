// Keyless TLD-level pricing from a bundled Porkbun snapshot.
//
// Why bundled and not live: Porkbun's pricing API stalls/blocks Cloudflare
// Worker egress (every live fetch times out on the edge), so we ship a snapshot
// compiled into the Worker. Prices change slowly; refresh it with:
//
//   bun run update-prices   (writes src/data/prices.json)
//
// IMPORTANT: this is the *base* price for the TLD, not the price for a specific
// name. Registry-premium names (short, dictionary, high-demand) can cost many
// multiples of this. Exact per-domain pricing needs an authenticated registrar API.

import type { Availability } from "./domain";
import pricesData from "../data/prices.json";

interface Snapshot {
  asOf: string;
  currency: string;
  source: string;
  pricing: Record<string, { registration: number; renewal: number; transfer: number }>;
}

const SNAPSHOT = pricesData as Snapshot;

export interface Price {
  registration: number;
  renewal: number;
  transfer: number;
  currency: "USD";
  source: "porkbun";
  /** This is a TLD base price, not a per-name (premium) price. */
  basis: "tld-base";
  /** ISO date the bundled snapshot was captured. */
  asOf: string;
}

/** Base price for a TLD, or null if we have no snapshot entry for it. */
export function priceForTld(tld: string): Price | null {
  const p = SNAPSHOT.pricing[tld.toLowerCase()];
  if (!p) return null;
  return {
    registration: p.registration,
    renewal: p.renewal,
    transfer: p.transfer,
    currency: "USD",
    source: "porkbun",
    basis: "tld-base",
    asOf: SNAPSHOT.asOf,
  };
}

/**
 * Attach TLD base pricing to availability results in place. By default only
 * prices domains that look available (the ones you'd actually register).
 */
export async function attachPricing(
  items: Availability[],
  opts: { onlyAvailable?: boolean } = {},
): Promise<void> {
  const onlyAvailable = opts.onlyAvailable ?? true;
  for (const item of items) {
    if (onlyAvailable && item.available !== true) continue;
    const price = priceForTld(item.tld);
    if (price) item.price = price;
  }
}
