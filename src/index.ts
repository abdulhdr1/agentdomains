// Bun entrypoint. `bun run src/index.ts` boots the HTTP API.

import { app } from "./server";

const port = Number(process.env.PORT ?? 8787);

console.log(`agentdomains listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
