#!/usr/bin/env bun
// agentdomains CLI. Talks to the core lib directly — no server required.
//
//   agentdomains check acme.io
//   agentdomains search acme --tlds com,io,ai
//   agentdomains search acme --json

import { checkOrSearch, isSearchResult, search } from "./lib/search";
import { parseTlds } from "./lib/tlds";
import { attachPricing } from "./lib/pricing";
import { formatAvailability, formatSearch } from "./lib/format";

const A = { amber: "\x1b[38;5;208m", dim: "\x1b[2m", reset: "\x1b[0m" };
const color = process.stdout.isTTY === true;
const paint = (s: string, c: string) => (color ? `${c}${s}${A.reset}` : s);

const HELP = `${paint("agentdomains", A.amber)} — find available domains

${paint("usage", A.dim)}
  agentdomains check  <domain|keyword>    check a domain; a bare keyword sweeps all TLDs
  agentdomains search <keyword> [opts]    sweep a keyword across TLDs

${paint("options", A.dim)}
  --tlds com,io,ai     TLDs to sweep (default: com,io,ai,dev,app,sh,co,net,org,xyz)
  --price              show TLD base registration price for available domains
  --json               emit raw JSON instead of a table
  -h, --help           show this
`;

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
    console.log(HELP);
    process.exit(cmd ? 0 : 1);
  }

  const json = argv.includes("--json");
  const price = argv.includes("--price");
  const positional = argv.slice(1).filter((a) => !a.startsWith("--"));
  const subject = positional[0];

  if (cmd === "check") {
    if (!subject) fail("check needs a domain, e.g. `agentdomains check acme.io`");
    // No TLD -> sweep all TLDs (optionally narrowed by --tlds).
    const tlds = parseTlds(getFlag(argv, "--tlds"));
    const result = await checkOrSearch(subject, tlds);
    if (isSearchResult(result)) {
      if (price) await attachPricing(result.results);
      console.log(json ? JSON.stringify(result, null, 2) : formatSearch(result, { color }));
      process.exit(result.available.length ? 0 : 1);
    }
    if (price) await attachPricing([result]);
    console.log(json ? JSON.stringify(result, null, 2) : formatAvailability(result, { color }));
    process.exit(result.available === false ? 1 : 0);
  }

  if (cmd === "search") {
    if (!subject) fail("search needs a keyword, e.g. `agentdomains search acme`");
    const tlds = parseTlds(getFlag(argv, "--tlds"));
    const result = await search(subject, tlds);
    if (price) await attachPricing(result.results);
    console.log(json ? JSON.stringify(result, null, 2) : formatSearch(result, { color }));
    process.exit(result.available.length ? 0 : 1);
  }

  fail(`unknown command: ${cmd}`);
}

function fail(message: string): never {
  console.error(paint("error:", "\x1b[38;5;203m") + " " + message);
  process.exit(2);
}

main().catch((err) => {
  console.error("fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
