// The one place app code gets zod from (D-084). jitless turns off zod's compiled fast path, which probes for
// eval with Function(""). The CSP forbids eval (D-083), so in the browser that probe raised a violation event
// on /room. zod reads this setting when each schema is built, so every app module that builds or parses
// schemas imports z from here (type-only imports from "zod" are fine). Scripts in scripts/ run in Node, where no CSP applies, and keep importing "zod".

import { z } from "zod";

z.config({ jitless: true });

export { z };
