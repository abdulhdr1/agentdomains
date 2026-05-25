// Ambient declaration for the Workers-only virtual module. Resolved by workerd
// at runtime; declared here so `tsc` is happy on Bun where it doesn't exist.
declare module "cloudflare:sockets" {
  export function connect(
    address: { hostname: string; port: number },
    options?: { secureTransport?: string; allowHalfOpen?: boolean },
  ): {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    opened: Promise<unknown>;
    close: () => Promise<void>;
  };
}
