// The default set of TLDs we sweep when an agent searches a bare keyword.
// Skewed toward what startups and agents actually want.
export const DEFAULT_TLDS = [
  "com",
  "io",
  "ai",
  "dev",
  "app",
  "sh",
  "co",
  "net",
  "org",
  "xyz",
] as const;

/** Parse a comma/space separated TLD list, lowercasing and dropping empties + dots. */
export function parseTlds(raw: string | null | undefined): string[] {
  if (!raw) return [...DEFAULT_TLDS];
  const tlds = raw
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
  return tlds.length ? Array.from(new Set(tlds)) : [...DEFAULT_TLDS];
}
