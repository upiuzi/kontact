// Email outreach campaigns & multi-brand sender profiles.

import { defineModule } from "../module.ts";
import { outreachRouter } from "../../routes/outreach.ts";

export const outreachModule = defineModule({
  id: "outreach",
  routers: [{ path: "/api/outreach", router: outreachRouter }],
});
