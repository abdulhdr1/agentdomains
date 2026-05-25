// TLDs we sweep when an agent searches a bare keyword. All TLDs here resolve
// authoritatively via RDAP/WHOIS (verified), so results aren't DNS guesses.

// The default sweep: popular, brandable, dev/startup/agent-flavored.
export const DEFAULT_TLDS = [
  "com", "io", "ai", "dev", "app", "co", "xyz", "sh", "net", "org",
  "tech", "cloud", "run", "build", "tools", "me", "bot", "site",
] as const;

// Named presets — pass as ?tlds=all (or startup/tech/agent), optionally mixed
// with bare TLDs, e.g. ?tlds=startup,vc
export const TLD_GROUPS: Record<string, readonly string[]> = {
  // A broad sweep across the most popular authoritative TLDs (~36).
  all: [
    "com", "net", "org", "io", "ai", "co", "xyz", "dev", "app", "sh",
    "tech", "cloud", "run", "build", "tools", "me", "bot", "site",
    "online", "store", "shop", "fun", "live", "studio", "design", "space",
    "world", "systems", "agency", "ninja", "fyi", "wtf", "link", "click",
    "page", "so",
  ],
  // Classic startup naming.
  startup: ["com", "io", "ai", "co", "xyz", "dev", "app", "tech", "cloud", "me", "so"],
  // Developer / infrastructure flavored.
  tech: ["dev", "app", "io", "ai", "run", "build", "tools", "cloud", "tech", "sh", "systems", "bot"],
  // Agent / AI themed.
  agent: ["ai", "bot", "dev", "app", "io", "run", "tools", "systems", "cloud", "sh"],
};

/**
 * Parse a comma/space separated TLD list. Group names (all/startup/tech/agent)
 * expand to their TLDs; bare TLDs are lowercased and de-dotted. Mixing is fine
 * ("startup,vc"). Empty input falls back to DEFAULT_TLDS.
 */
export function parseTlds(raw: string | null | undefined): string[] {
  if (!raw) return [...DEFAULT_TLDS];
  const tokens = raw
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
  if (!tokens.length) return [...DEFAULT_TLDS];

  const out: string[] = [];
  for (const tok of tokens) {
    const group = TLD_GROUPS[tok];
    if (group) out.push(...group);
    else out.push(tok);
  }
  return Array.from(new Set(out));
}
