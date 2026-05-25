// Workers runtime bindings. The HTTP path reads these off Hono's `c.env`.
// All optional so the app also runs on Bun (CLI/MCP/local) where they're absent.

interface AnalyticsEngineDataset {
  writeDataPoint(event: {
    blobs?: (string | null)[];
    doubles?: number[];
    indexes?: string[];
  }): void;
}

interface Env {
  /** Analytics Engine dataset for usage telemetry (bound in wrangler.toml). */
  AE?: AnalyticsEngineDataset;
  /** Cloudflare account id — only needed to read stats back via /stats. */
  CF_ACCOUNT_ID?: string;
  /** Read-only Cloudflare API token with Account Analytics:Read — for /stats. */
  CF_API_TOKEN?: string;
}
