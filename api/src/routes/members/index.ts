import type { Context } from "oak/mod.ts";

const router = new Router();

router
    .get("/members", (context: Context) => getAllMembers(context))
    .get("/members/:id", (context: Context) => getMember(context));

  export router;