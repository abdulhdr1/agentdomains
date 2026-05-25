// MCP server exposing domain availability as agent tools over stdio.
//
//   bun run src/mcp.ts
//
// Tools:
//   check_domain   { domain }            -> availability of one domain
//   search_domains { keyword, tlds? }    -> sweep a keyword across TLDs

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkOrSearch, isSearchResult, search } from "./lib/search";
import { parseTlds } from "./lib/tlds";
import { attachPricing } from "./lib/pricing";

const server = new McpServer({ name: "agentdomains", version: "0.1.0" });

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

server.registerTool(
  "check_domain",
  {
    title: "Check domain availability",
    description:
      "Check whether a domain looks available to register. If you pass a " +
      "fully-qualified domain ('acme.io') it checks just that one. If you pass " +
      "a bare keyword with no TLD ('acme') it sweeps all default TLDs and " +
      "returns a search result. Uses RDAP with a DNS fallback. `available` is " +
      "true/false, or null when it can't be determined (rate limit, no RDAP).",
    inputSchema: {
      domain: z
        .string()
        .describe("A domain ('acme.io') or a bare keyword with no TLD ('acme')."),
      tlds: z
        .array(z.string())
        .optional()
        .describe("TLDs to sweep when no TLD is given. Defaults to the startup set."),
      pricing: z
        .boolean()
        .optional()
        .describe("Attach TLD base registration price (USD) to available domains."),
    },
  },
  async ({ domain, tlds, pricing }) => {
    const result = await checkOrSearch(
      domain,
      tlds && tlds.length ? parseTlds(tlds.join(",")) : undefined,
    );
    if (pricing) await attachPricing(isSearchResult(result) ? result.results : [result]);
    return json(result);
  },
);

server.registerTool(
  "search_domains",
  {
    title: "Search available domains across TLDs",
    description:
      "Sweep a keyword across multiple TLDs and return which are available. " +
      "If the keyword already contains a dot it is treated as a single domain. " +
      "Returns a list of available domains plus per-domain detail.",
    inputSchema: {
      keyword: z
        .string()
        .describe("A brand keyword (e.g. 'acme') or an explicit domain."),
      tlds: z
        .array(z.string())
        .optional()
        .describe(
          "TLDs to sweep without the leading dot. Defaults to a startup set: " +
            "com, io, ai, dev, app, sh, co, net, org, xyz.",
        ),
      pricing: z
        .boolean()
        .optional()
        .describe("Attach TLD base registration price (USD) to available domains."),
    },
  },
  async ({ keyword, tlds, pricing }) => {
    const result = await search(
      keyword,
      tlds && tlds.length ? parseTlds(tlds.join(",")) : undefined,
    );
    if (pricing) await attachPricing(result.results);
    return json(result);
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the protocol channel — logs must go to stderr.
  console.error("agentdomains mcp server running on stdio");
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
