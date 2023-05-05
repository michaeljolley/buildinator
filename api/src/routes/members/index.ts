import type { Context } from "https://deno.land/x/oak@v12.4.0/mod.ts";

export default new Router()
    .get("/members", (context: Context) => getAllMembers(context))
    .get("/members/:id", (context: Context) => getMember(context));

