// Usage telemetry via Cloudflare Analytics Engine. Writing is keyless and
// fire-and-forget from the Worker; reading (the /stats endpoint) uses the
// Analytics Engine SQL API, which needs a read-only API token.

import type { Availability } from "./domain";
import { isSearchResult, type CheckResult } from "./search";
import type { SearchResult } from "./search";

const DATASET = "agentdomains_usage";

interface TrackInput {
  endpoint: "/v1/check" | "/v1/search";
  result: CheckResult | SearchResult;
  pricing: boolean;
  country: string | null;
}

/**
 * Record one API call. Non-blocking and best-effort: a missing binding (e.g.
 * running on Bun) or any error is silently ignored — telemetry never breaks a
 * request.
 */
export function track(env: Env | undefined, input: TrackInput): void {
  if (!env?.AE) return;

  const { endpoint, result, pricing, country } = input;
  const rows: Availability[] = isSearchResult(result) ? result.results : [result];
  const availableCount = rows.filter((r) => r.available === true).length;

  const mode =
    endpoint === "/v1/search"
      ? "search"
      : isSearchResult(result)
        ? "sweep"
        : "single";

  const sources = new Set(rows.map((r) => r.source));
  const source = sources.size === 1 ? [...sources][0]! : "mixed";
  const primaryTld = rows[0]?.tld ?? "";

  try {
    env.AE.writeDataPoint({
      blobs: [endpoint, mode, source, country, primaryTld, pricing ? "1" : "0"],
      doubles: [rows.length, availableCount],
      indexes: [endpoint],
    });
  } catch {
    // ignore — telemetry is best-effort
  }
}

export interface Stats {
  windowDays: number;
  totalRequests: number;
  byEndpoint: { endpoint: string; requests: number }[];
  topTlds: { tld: string; requests: number }[];
  byCountry: { country: string; requests: number }[];
}

/** Read aggregated usage back via the Analytics Engine SQL API. */
export async function readStats(
  env: Env | undefined,
  windowDays = 7,
): Promise<Stats | { error: string }> {
  if (!env?.CF_ACCOUNT_ID || !env?.CF_API_TOKEN) {
    return {
      error:
        "stats not configured: set CF_ACCOUNT_ID and CF_API_TOKEN (Account Analytics:Read) as Worker secrets",
    };
  }

  const since = `now() - INTERVAL '${windowDays}' DAY`;
  const sum = "sum(_sample_interval)"; // Analytics Engine samples at volume; this estimates true counts

  const [byEndpoint, topTlds, byCountry] = await Promise.all([
    sql(env, `SELECT blob1 AS endpoint, ${sum} AS requests FROM ${DATASET} WHERE timestamp > ${since} GROUP BY endpoint ORDER BY requests DESC`),
    sql(env, `SELECT blob5 AS tld, ${sum} AS requests FROM ${DATASET} WHERE timestamp > ${since} AND blob5 != '' GROUP BY tld ORDER BY requests DESC LIMIT 15`),
    sql(env, `SELECT blob4 AS country, ${sum} AS requests FROM ${DATASET} WHERE timestamp > ${since} AND blob4 != '' GROUP BY country ORDER BY requests DESC LIMIT 15`),
  ]);

  const ep = rows<{ endpoint: string; requests: number }>(byEndpoint);
  return {
    windowDays,
    totalRequests: ep.reduce((n, r) => n + Number(r.requests), 0),
    byEndpoint: ep.map((r) => ({ endpoint: r.endpoint, requests: Number(r.requests) })),
    topTlds: rows<{ tld: string; requests: number }>(topTlds).map((r) => ({
      tld: r.tld,
      requests: Number(r.requests),
    })),
    byCountry: rows<{ country: string; requests: number }>(byCountry).map((r) => ({
      country: r.country,
      requests: Number(r.requests),
    })),
  };
}

async function sql(env: Env, query: string): Promise<unknown> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, "Content-Type": "text/plain" },
      body: query,
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) throw new Error(`analytics_engine sql http ${res.status}`);
  return res.json();
}

function rows<T>(resp: unknown): T[] {
  return ((resp as { data?: T[] })?.data ?? []) as T[];
}
