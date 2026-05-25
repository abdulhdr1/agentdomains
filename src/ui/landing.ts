// The terminal.shop-flavored landing / docs page. Self-contained: inline CSS,
// system monospace stack, zero external requests.

const LOGO = String.raw`
 ▄▀█ █▀▀ █▀▀ █▄░█ ▀█▀   █▀▄ █▀█ █▀▄▀█ ▄▀█ █ █▄░█ █▀
 █▀█ █▄█ ██▄ █░▀█ ░█░   █▄▀ █▄█ █░▀░█ █▀█ █ █░▀█ ▄█`;

export function landingPage(origin: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>agentdomains — domains for agents</title>
<meta name="description" content="An API for agents to find available domains to buy. RDAP-backed. No dashboards, no keys." />
<style>
  :root {
    --bg: #0a0a0a;
    --fg: #d7d7d7;
    --dim: #6e6e6e;
    --amber: #ff5c00;
    --green: #3fb950;
    --red: #ff6b6b;
    --border: #1c1c1c;
    --panel: #0f0f0f;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-size: 14px;
    line-height: 1.65;
    padding: 48px 20px 96px;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 760px; margin: 0 auto; }
  a { color: var(--amber); text-decoration: none; }
  a:hover { text-decoration: underline; }
  pre.logo {
    color: var(--amber);
    font-size: clamp(7px, 2.1vw, 13px);
    line-height: 1.1;
    margin: 0 0 8px;
    overflow: hidden;
    white-space: pre;
  }
  .tag { color: var(--dim); margin: 0 0 28px; }
  .tag b { color: var(--fg); font-weight: 400; }
  nav { margin: 0 0 40px; color: var(--dim); }
  nav a { margin-right: 6px; }
  nav .b { color: var(--dim); }
  h2 {
    color: var(--fg);
    font-size: 14px;
    font-weight: 700;
    margin: 40px 0 4px;
    letter-spacing: 0.02em;
  }
  h2::before { content: "## "; color: var(--amber); }
  .rule { color: var(--border); margin: 0 0 14px; user-select: none; }
  p { margin: 0 0 14px; }
  .dim { color: var(--dim); }
  .amber { color: var(--amber); }
  .green { color: var(--green); }
  .red { color: var(--red); }
  pre.code {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 0 0 16px;
    color: #cfcfcf;
  }
  pre.code .c { color: var(--dim); }
  pre.code .k { color: var(--amber); }
  pre.code .s { color: var(--green); }
  .prompt { color: var(--amber); }
  footer {
    margin-top: 56px;
    padding-top: 18px;
    border-top: 1px solid var(--border);
    color: var(--dim);
  }
  .cursor {
    display: inline-block;
    width: 8px; height: 1em;
    background: var(--amber);
    vertical-align: text-bottom;
    animation: blink 1.1s steps(1) infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }
</style>
</head>
<body>
<div class="wrap">
  <pre class="logo">${LOGO}</pre>
  <p class="tag"><b>domains for agents, by agents.</b> &nbsp;no dashboards. no keys. just a name.<span class="cursor"></span></p>

  <nav>
    <span class="b">[</span><a href="#check">check</a><span class="b">]</span>
    <span class="b">[</span><a href="#search">search</a><span class="b">]</span>
    <span class="b">[</span><a href="#mcp">mcp</a><span class="b">]</span>
    <span class="b">[</span><a href="#cli">cli</a><span class="b">]</span>
    <span class="b">[</span><a href="#api">api</a><span class="b">]</span>
    <span class="b">[</span><a href="#agents">agents</a><span class="b">]</span>
  </nav>

  <p>
    <span class="amber">agentdomains</span> is a tiny HTTP API that tells your agents which
    domains are still up for grabs. It asks the actual registries over
    <a href="https://about.rdap.org/" target="_blank" rel="noreferrer">RDAP</a> —
    the protocol that replaced WHOIS — and falls back to DNS when a registry stays quiet.
    Point an agent at it, sweep a name across ten TLDs in one request, get back clean JSON.
  </p>

  <h2 id="check">check one domain</h2>
  <div class="rule">${"=".repeat(54)}</div>
  <p class="dim">Pass a bare keyword with no TLD and it sweeps every TLD instead.</p>
  <pre class="code"><span class="prompt">$</span> curl <span class="s">${origin}/v1/check?domain=acme.io</span>

{
  <span class="k">"domain"</span>: <span class="s">"acme.io"</span>,
  <span class="k">"tld"</span>: <span class="s">"io"</span>,
  <span class="k">"available"</span>: <span class="green">true</span>,
  <span class="k">"source"</span>: <span class="s">"rdap"</span>,
  <span class="k">"checkedAt"</span>: <span class="s">"2026-05-25T12:00:00.000Z"</span>
}</pre>

  <h2 id="search">sweep a name across TLDs</h2>
  <div class="rule">${"=".repeat(54)}</div>
  <p class="dim">One keyword, many TLDs. Defaults to com, io, ai, dev, app, sh, co, net, org, xyz.</p>
  <pre class="code"><span class="prompt">$</span> curl <span class="s">"${origin}/v1/search?q=acme&amp;tlds=com,io,ai"</span>

{
  <span class="k">"query"</span>: <span class="s">"acme"</span>,
  <span class="k">"available"</span>: [<span class="s">"acme.ai"</span>],
  <span class="k">"results"</span>: [
    { <span class="k">"domain"</span>: <span class="s">"acme.com"</span>, <span class="k">"available"</span>: <span class="red">false</span>, <span class="k">"source"</span>: <span class="s">"rdap"</span> },
    { <span class="k">"domain"</span>: <span class="s">"acme.io"</span>,  <span class="k">"available"</span>: <span class="red">false</span>, <span class="k">"source"</span>: <span class="s">"rdap"</span> },
    { <span class="k">"domain"</span>: <span class="s">"acme.ai"</span>,  <span class="k">"available"</span>: <span class="green">true</span>,  <span class="k">"source"</span>: <span class="s">"rdap"</span> }
  ]
}</pre>
  <p class="dim">Want it pretty in a terminal? add <span class="amber">&amp;format=text</span>.</p>

  <h2 id="mcp">plug it into an agent (MCP)</h2>
  <div class="rule">${"=".repeat(54)}</div>
  <p class="dim">Exposes two tools — <span class="amber">check_domain</span> and <span class="amber">search_domains</span> — over stdio.</p>
  <pre class="code"><span class="c">// claude / cursor mcp config</span>
{
  <span class="k">"mcpServers"</span>: {
    <span class="k">"agentdomains"</span>: {
      <span class="k">"command"</span>: <span class="s">"bun"</span>,
      <span class="k">"args"</span>: [<span class="s">"run"</span>, <span class="s">"/path/to/agentdomains/src/mcp.ts"</span>]
    }
  }
}</pre>

  <h2 id="cli">or from the shell</h2>
  <div class="rule">${"=".repeat(54)}</div>
  <pre class="code"><span class="prompt">$</span> bun run cli search acme --tlds com,io,ai

<span class="amber">search: acme</span>
<span class="c">========================================</span>
<span class="red">○  taken</span>      acme.com               <span class="c">[rdap]</span>
<span class="red">○  taken</span>      acme.io                <span class="c">[rdap]</span>
<span class="green">●  available</span>  acme.ai                <span class="c">[rdap]</span>

<span class="green">1 available:</span> acme.ai</pre>

  <h2 id="api">api reference</h2>
  <div class="rule">${"=".repeat(54)}</div>
  <pre class="code"><span class="k">GET</span> /v1/check    <span class="c">?domain=acme.io [&tlds=…] [&pricing=true] [&format=text]</span>
<span class="k">GET</span> /v1/search   <span class="c">?q=acme [&tlds=com,io,ai] [&pricing=true] [&format=text]</span>
<span class="k">GET</span> /health      <span class="c">liveness</span></pre>
  <p class="dim">
    <span class="amber">available</span> is <span class="green">true</span> / <span class="red">false</span> / <span class="dim">null</span>.
    null means we couldn't get a straight answer — treat it as "check again", not "free".
    <span class="amber">confidence</span> is <span class="green">authoritative</span> (RDAP/WHOIS) or <span class="dim">heuristic</span> (DNS).
  </p>
  <p class="dim">
    Add <span class="amber">&amp;pricing=true</span> to attach each available domain's TLD base price (USD).
    Heads up: that's the <span class="amber">base</span> price — registry-premium names can cost far more.
  </p>

  <h2 id="agents">for agents to navigate</h2>
  <div class="rule">${"=".repeat(54)}</div>
  <pre class="code"><span class="k">GET</span> /                <span class="c">Accept: application/json -> discovery index</span>
<span class="k">GET</span> /llms.txt        <span class="c">markdown map (llmstxt.org)</span>
<span class="k">GET</span> /openapi.json    <span class="c">OpenAPI 3.1 spec</span></pre>
  <p class="dim">
    Machine-readable entry points so an agent can bootstrap from the URL alone.
    See <a href="/llms.txt">/llms.txt</a> · <a href="/openapi.json">/openapi.json</a>.
  </p>

  <footer>
    built by <a href="https://x.com/abdulhdr1/" target="_blank" rel="noreferrer">@abdulhdr</a> · RDAP + DNS · MIT · <span class="dim">a fun project, not a registrar</span>
  </footer>
</div>
</body>
</html>`;
}
