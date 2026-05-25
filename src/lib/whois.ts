// WHOIS (port 43) availability lookups — the authoritative fallback for TLDs
// with no RDAP server (e.g. some ccTLDs).
//
// Raw TCP is runtime-specific: on Cloudflare Workers we use `cloudflare:sockets`,
// on Bun/Node we use `node:net`. We pick at runtime. The Cloudflare module is
// imported by literal specifier (bundled on Workers, throws-and-caught on Bun);
// `node:net` is imported by a computed specifier so the Workers bundler leaves
// it external and never tries to resolve it (that branch never runs on Workers).

import { tldOf } from "./domain";

const PORT = 43;
const TIMEOUT_MS = 7000;
const MAX_BYTES = 64 * 1024;

// WHOIS servers that don't follow the `whois.nic.{tld}` convention.
const WHOIS_OVERRIDES: Record<string, string> = {
  ai: "whois.nic.ai",
  co: "whois.registry.co",
};

// Substrings that mean "no such registration" -> available. Lowercased.
const AVAILABLE_MARKERS = [
  "no match",
  "not found",
  "no entries found",
  "no data found",
  "no object found",
  "domain not found",
  "does not exist",
  "available for registration",
  "is available",
  "status: free",
  "status: available",
];

// Substrings that only appear on a registered domain.
const REGISTERED_MARKERS = [
  "domain name:",
  "creation date:",
  "registry domain id:",
  "registrar whois server:",
  "registrar:",
  "name server:",
  "status: connect", // DENIC (.de) marks a registered domain "Status: connect"
];

export type WhoisStatus =
  | { registered: true }
  | { registered: false }
  | { registered: null; note: string };

/** Look up a domain over WHOIS and infer whether it is registered. */
export async function whoisLookup(domain: string): Promise<WhoisStatus> {
  const tld = tldOf(domain);
  const server = WHOIS_OVERRIDES[tld] ?? `whois.nic.${tld}`;

  let raw: string;
  try {
    raw = await whoisQuery(server, domain);
  } catch (err) {
    return { registered: null, note: `whois ${server} failed: ${msg(err)}` };
  }

  const text = raw.toLowerCase();
  if (!text.trim()) return { registered: null, note: `empty whois from ${server}` };

  // "Available" markers win — a not-found response can still echo "Domain Name".
  if (AVAILABLE_MARKERS.some((m) => text.includes(m))) return { registered: false };
  if (REGISTERED_MARKERS.some((m) => text.includes(m))) return { registered: true };
  return { registered: null, note: `whois ${server} response inconclusive` };
}

/** Send a WHOIS query and return the full text response, with a timeout. */
async function whoisQuery(server: string, domain: string): Promise<string> {
  const query = `${domain}\r\n`;
  return withTimeout(
    (async () => {
      const connect = await cfConnect();
      return connect
        ? whoisViaCfSockets(connect, server, query)
        : whoisViaNodeNet(server, query);
    })(),
    TIMEOUT_MS,
  );
}

// --- Cloudflare Workers path (cloudflare:sockets) ---------------------------

type CfConnect = (
  addr: { hostname: string; port: number },
  opts?: { secureTransport?: string; allowHalfOpen?: boolean },
) => {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  opened: Promise<unknown>;
  close: () => Promise<void>;
};

let cfConnectCache: CfConnect | null | undefined;

async function cfConnect(): Promise<CfConnect | null> {
  if (cfConnectCache !== undefined) return cfConnectCache;
  try {
    const mod = (await import("cloudflare:sockets")) as { connect: CfConnect };
    cfConnectCache = mod.connect;
  } catch {
    cfConnectCache = null; // not on Workers — fall back to node:net
  }
  return cfConnectCache;
}

async function whoisViaCfSockets(
  connect: CfConnect,
  server: string,
  query: string,
): Promise<string> {
  // allowHalfOpen: closing the write side sends FIN (so the server sees EOF and
  // responds) without tearing down the read side. Without it, the edge runtime
  // closes the whole socket on writer.close() and the response comes back empty.
  const socket = connect(
    { hostname: server, port: PORT },
    { secureTransport: "off", allowHalfOpen: true },
  );
  await socket.opened;
  const writer = socket.writable.getWriter();
  await writer.write(new TextEncoder().encode(query));
  // Don't close the writer (that can tear the socket down at the edge before
  // the reply arrives) — just release the lock. WHOIS servers reply on the
  // CRLF-terminated query and then close, which ends our read loop.
  writer.releaseLock();

  const reader = socket.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
        if (total > MAX_BYTES) break;
      }
    }
  } finally {
    await socket.close().catch(() => {});
  }
  return concatDecode(chunks);
}

// --- Bun / Node path (node:net) ---------------------------------------------

async function whoisViaNodeNet(server: string, query: string): Promise<string> {
  // Computed specifier: keeps the Workers bundler from resolving node:net.
  const spec = ["node", "net"].join(":");
  const net = (await import(/* @vite-ignore */ spec)) as typeof import("node:net");

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const socket = net.connect(PORT, server);
    socket.setTimeout(TIMEOUT_MS);
    socket.on("connect", () => socket.write(query));
    socket.on("data", (d: Buffer) => chunks.push(d));
    socket.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("whois timeout"));
    });
    socket.on("error", reject);
  });
}

// --- helpers ----------------------------------------------------------------

function concatDecode(chunks: Uint8Array[]): string {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(buf);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`whois timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
