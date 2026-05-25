// Machine-readable discovery surfaces so an agent can bootstrap from the URL
// alone: a JSON index (served at `/` under Accept: application/json), an
// llms.txt map, and an OpenAPI 3.1 spec.

import { DEFAULT_TLDS } from "../lib/tlds";

const VERSION = "0.1.0";
const SUMMARY =
  "An API for agents to find available domains to register. RDAP-backed with a DNS-over-HTTPS fallback. No API keys.";

/** JSON index returned from `/` when the client asks for application/json. */
export function discoveryDoc(origin: string) {
  return {
    name: "agentdomains",
    description: SUMMARY,
    version: VERSION,
    endpoints: [
      {
        method: "GET",
        path: "/v1/check",
        summary:
          "Check one domain. A bare keyword with no TLD (e.g. 'acme') sweeps all TLDs and returns a search result.",
        params: {
          domain: {
            type: "string",
            required: true,
            example: "acme.io",
            description: "A full domain ('acme.io') or a bare keyword ('acme').",
          },
          tlds: {
            type: "string",
            required: false,
            description: "TLDs to sweep when no TLD is given.",
          },
          pricing: {
            type: "boolean",
            required: false,
            description: "Set true to attach TLD base price (USD) to available domains.",
          },
          format: { type: "string", enum: ["json", "text"], required: false },
        },
        example: `${origin}/v1/check?domain=acme.io`,
      },
      {
        method: "GET",
        path: "/v1/search",
        summary: "Sweep a keyword across multiple TLDs and return what's available.",
        params: {
          q: { type: "string", required: true, example: "acme" },
          tlds: {
            type: "string",
            required: false,
            description: "Comma-separated TLDs without the dot.",
            default: DEFAULT_TLDS.join(","),
          },
          pricing: {
            type: "boolean",
            required: false,
            description: "Set true to attach TLD base price (USD) to available domains.",
          },
          format: { type: "string", enum: ["json", "text"], required: false },
        },
        example: `${origin}/v1/search?q=acme&tlds=com,io,ai`,
      },
      {
        method: "GET",
        path: "/health",
        summary: "Liveness probe.",
        params: {},
        example: `${origin}/health`,
      },
    ],
    fields: {
      available:
        "true (looks free) | false (taken) | null (could not determine — re-check, do not treat as free)",
      source: "rdap | whois | dns | unknown",
      confidence:
        "authoritative (RDAP or WHOIS — definitive) | heuristic (DNS-inferred or undetermined — re-check)",
      price:
        "present only with ?pricing=true. TLD BASE price in USD (Porkbun) — registry-premium names can cost far more.",
    },
    mcp: {
      transport: "stdio",
      command: "bun",
      args: ["run", "/absolute/path/to/agentdomains/src/mcp.ts"],
      tools: ["check_domain", "search_domains"],
    },
    docs: {
      openapi: `${origin}/openapi.json`,
      llms: `${origin}/llms.txt`,
      human: origin,
    },
  };
}

/** llmstxt.org-style markdown map of the API. */
export function llmsTxt(origin: string): string {
  return `# agentdomains

> ${SUMMARY}

agentdomains tells agents which domains are still available to register. It
checks registries authoritatively over RDAP, falls back to WHOIS (port 43) for
TLDs with no RDAP server, and to a DNS heuristic as a last resort. \`available\`
is \`true\`, \`false\`, or \`null\` — null means "couldn't determine; re-check",
not "free". Every result carries \`confidence\`: \`authoritative\` (RDAP/WHOIS)
or \`heuristic\` (DNS).

## API

- [Check one domain](${origin}/v1/check?domain=acme.io): \`GET /v1/check?domain={domain}\` — availability of one domain. A bare keyword with no TLD sweeps all TLDs. Add \`&pricing=true\` for prices, \`&format=text\` for ASCII.
- [Search across TLDs](${origin}/v1/search?q=acme&tlds=com,io,ai): \`GET /v1/search?q={keyword}&tlds={csv}\` — sweep a keyword across TLDs (default: ${DEFAULT_TLDS.join(", ")}). Supports \`&pricing=true\` and \`&format=text\`.
- [Prices](${origin}/v1/search?q=acme&pricing=true): add \`&pricing=true\` to attach each available domain's TLD base price (USD, Porkbun snapshot). Base price only — registry-premium names cost more.
- [Health](${origin}/health): \`GET /health\` — liveness.

## Docs

- [OpenAPI 3.1 spec](${origin}/openapi.json): full machine-readable contract.
- [Discovery JSON](${origin}/): request \`/\` with \`Accept: application/json\` for a JSON index.

## MCP

Run \`bun run src/mcp.ts\` for an MCP stdio server exposing two tools:
\`check_domain\` and \`search_domains\`.
`;
}

/** OpenAPI 3.1 description of the HTTP API. */
export function openApiSpec(origin: string) {
  return {
    openapi: "3.1.0",
    info: { title: "agentdomains", version: VERSION, description: SUMMARY },
    servers: [{ url: origin }],
    paths: {
      "/v1/check": {
        get: {
          operationId: "checkDomain",
          summary:
            "Check one domain. A bare keyword with no TLD sweeps all TLDs and returns a SearchResult instead.",
          parameters: [
            {
              name: "domain",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "A full domain ('acme.io') or a bare keyword ('acme').",
              example: "acme.io",
            },
            {
              name: "tlds",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "TLDs to sweep when no TLD is given.",
            },
            {
              name: "pricing",
              in: "query",
              required: false,
              schema: { type: "boolean" },
              description: "Attach TLD base price (USD) to available domains.",
            },
            {
              name: "format",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["json", "text"] },
            },
          ],
          responses: {
            "200": {
              description:
                "Availability for a full domain, or a SearchResult when no TLD was given.",
              content: {
                "application/json": {
                  schema: {
                    oneOf: [
                      { $ref: "#/components/schemas/Availability" },
                      { $ref: "#/components/schemas/SearchResult" },
                    ],
                  },
                },
              },
            },
            "400": { description: "Missing domain parameter" },
          },
        },
      },
      "/v1/search": {
        get: {
          operationId: "searchDomains",
          summary: "Sweep a keyword across TLDs.",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string" },
              example: "acme",
            },
            {
              name: "tlds",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Comma-separated TLDs without the dot.",
              example: "com,io,ai",
            },
            {
              name: "pricing",
              in: "query",
              required: false,
              schema: { type: "boolean" },
              description: "Attach TLD base price (USD) to available domains.",
            },
            {
              name: "format",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["json", "text"] },
            },
          ],
          responses: {
            "200": {
              description: "Search result",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SearchResult" },
                },
              },
            },
            "400": { description: "Missing q parameter" },
          },
        },
      },
      "/health": {
        get: {
          operationId: "health",
          summary: "Liveness probe.",
          responses: { "200": { description: "ok" } },
        },
      },
    },
    components: {
      schemas: {
        Availability: {
          type: "object",
          required: ["domain", "tld", "available", "source", "confidence", "checkedAt"],
          properties: {
            domain: { type: "string", example: "acme.io" },
            tld: { type: "string", example: "io" },
            available: {
              type: ["boolean", "null"],
              description:
                "true = looks free, false = taken, null = could not determine.",
            },
            source: { type: "string", enum: ["rdap", "whois", "dns", "unknown"] },
            confidence: {
              type: "string",
              enum: ["authoritative", "heuristic"],
              description: "authoritative = RDAP/WHOIS; heuristic = DNS-inferred.",
            },
            note: { type: "string" },
            price: { $ref: "#/components/schemas/Price" },
            checkedAt: { type: "string", format: "date-time" },
          },
        },
        Price: {
          type: "object",
          description:
            "TLD BASE price from a bundled Porkbun snapshot, present only with pricing=true. Registry-premium names can cost far more than this.",
          required: ["registration", "renewal", "transfer", "currency", "source", "basis", "asOf"],
          properties: {
            registration: { type: "number" },
            renewal: { type: "number" },
            transfer: { type: "number" },
            currency: { type: "string", enum: ["USD"] },
            source: { type: "string", enum: ["porkbun"] },
            basis: { type: "string", enum: ["tld-base"] },
            asOf: { type: "string", format: "date", description: "Date the price snapshot was captured." },
          },
        },
        SearchResult: {
          type: "object",
          required: ["query", "results", "available", "checkedAt"],
          properties: {
            query: { type: "string" },
            available: { type: "array", items: { type: "string" } },
            results: {
              type: "array",
              items: { $ref: "#/components/schemas/Availability" },
            },
            checkedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  };
}
