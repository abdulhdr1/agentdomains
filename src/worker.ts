// Cloudflare Workers entrypoint. A Hono app is itself a valid Worker handler
// (it exposes `.fetch`), so we just re-export it.

import { app } from "./server";

export default app;
