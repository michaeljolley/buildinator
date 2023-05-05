import type { Context } from "https://deno.land/x/oak@v12.4.0/mod.ts";

const members = new Router();

members
    .get("/members", (context: Context) => getAllMembers(context))
    .get("/members/:id", (context: Context) => getMember(context));

export members;
