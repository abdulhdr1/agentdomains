// A terminal.shop-styled, syntax-highlighted viewer for JSON responses — shown
// when a human opens an endpoint in a browser. Agents/curl get raw JSON instead
// (see sendJson in server.ts). Highlighting is done server-side: pretty-print,
// HTML-escape, then wrap tokens in colored spans.

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(escaped: string): string {
  // Match JSON string (optionally a key if followed by ':'), boolean, null, or number.
  const token =
    /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  return escaped.replace(token, (m) => {
    let cls = "num";
    if (m.startsWith("&quot;") || m.startsWith('"')) cls = /:\s*$/.test(m) ? "key" : "str";
    else if (m === "true" || m === "false") cls = "bool";
    else if (m === "null") cls = "null";
    return `<span class="${cls}">${m}</span>`;
  });
}

export function jsonViewPage(data: unknown, opts: { path: string; rawUrl: string }): string {
  const html = highlight(esc(JSON.stringify(data, null, 2)));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(opts.path)} — agentdomains</title>
<style>
  :root {
    --bg:#0a0a0a; --fg:#d7d7d7; --dim:#6e6e6e; --amber:#ff5c00;
    --green:#3fb950; --num:#58a6ff; --bool:#d2a8ff; --null:#ff6b6b; --border:#1c1c1c;
  }
  * { box-sizing:border-box; }
  * { scrollbar-width:thin; scrollbar-color:#2f2f2f transparent; }
  ::-webkit-scrollbar { width:10px; height:10px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:8px; }
  ::-webkit-scrollbar-thumb:hover { background:var(--amber); }
  ::-webkit-scrollbar-corner { background:transparent; }
  body {
    margin:0; background:var(--bg); color:var(--fg);
    font-family: ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
    font-size:13.5px; line-height:1.6; padding:24px 20px 64px;
    -webkit-font-smoothing:antialiased;
  }
  .wrap { max-width:860px; margin:0 auto; }
  .bar {
    display:flex; align-items:center; gap:10px; margin-bottom:16px;
    color:var(--dim); border-bottom:1px solid var(--border); padding-bottom:12px;
  }
  .bar a { color:var(--amber); text-decoration:none; }
  .bar a:hover { text-decoration:underline; }
  .bar .path { color:var(--fg); }
  .bar .sp { flex:1; }
  pre.json {
    margin:0; white-space:pre-wrap; word-break:break-word;
    tab-size:2;
  }
  .key  { color:var(--amber); }
  .str  { color:var(--green); }
  .num  { color:var(--num); }
  .bool { color:var(--bool); }
  .null { color:var(--null); }
  a.link { color:var(--green); }
</style>
</head>
<body>
  <div class="wrap">
    <div class="bar">
      <a href="/">agentdomains</a>
      <span>/</span>
      <span class="path">${esc(opts.path)}</span>
      <span class="sp"></span>
      <a href="${esc(opts.rawUrl)}">[raw]</a>
    </div>
    <pre class="json">${linkify(html)}</pre>
  </div>
</body>
</html>`;
}

// Turn quoted http(s) URLs in string values into clickable links (handy for the
// example/discovery/docs URLs an agentdomains response often contains). Quotes
// aren't HTML-escaped, and URLs may contain &amp; from query strings — so match
// real quotes and allow everything up to the closing quote.
function linkify(html: string): string {
  return html.replace(
    /(<span class="str">")(https?:\/\/[^"<]+)("<\/span>)/g,
    (_m, a, url, b) => `${a}<a class="link" href="${url}">${url}</a>${b}`,
  );
}
