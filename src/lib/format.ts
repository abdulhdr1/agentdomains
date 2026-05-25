// Plain-text / ASCII renderers shared by the HTTP API (?format=text) and the
// CLI. ANSI colors are opt-in so the same functions can produce clean output
// for both a terminal and an HTTP response body.

import type { Availability } from "./domain";
import type { SearchResult } from "./search";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  amber: "\x1b[38;5;208m",
  green: "\x1b[38;5;42m",
  red: "\x1b[38;5;203m",
  gray: "\x1b[38;5;244m",
};

interface FormatOpts {
  color?: boolean;
}

function paint(s: string, code: string, color: boolean): string {
  return color ? `${code}${s}${ANSI.reset}` : s;
}

function statusGlyph(a: Availability, color: boolean): string {
  if (a.available === true) return paint("●  available", ANSI.green, color);
  if (a.available === false) return paint("○  taken    ", ANSI.red, color);
  return paint("?  unknown  ", ANSI.gray, color);
}

/** Render a single availability result as a one-liner. */
export function formatAvailability(a: Availability, opts: FormatOpts = {}): string {
  const color = opts.color ?? false;
  const status = statusGlyph(a, color);
  const note = a.note ? paint(`  (${a.note})`, ANSI.dim, color) : "";
  const src = paint(`[${a.source}]`, ANSI.dim, color);
  const price = a.price
    ? "  " + paint(`$${a.price.registration.toFixed(2)}/yr`, ANSI.amber, color)
    : "";
  return `${status}  ${a.domain.padEnd(24)} ${src}${price}${note}`;
}

/** Render a full multi-TLD search result as an ASCII block. */
export function formatSearch(result: SearchResult, opts: FormatOpts = {}): string {
  const color = opts.color ?? false;
  const lines: string[] = [];
  lines.push(paint(`search: ${result.query}`, ANSI.amber, color));
  lines.push(paint("=".repeat(40), ANSI.dim, color));
  for (const r of result.results) lines.push(formatAvailability(r, opts));
  lines.push("");
  const n = result.available.length;
  lines.push(
    paint(
      `${n} available${n ? ":" : "."}`,
      n ? ANSI.green : ANSI.gray,
      color,
    ) + (n ? " " + result.available.join(", ") : ""),
  );
  return lines.join("\n");
}
