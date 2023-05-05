import { Context, Router } from "https://deno.land/x/oak@v12.4.0/mod.ts";

import { getAllMembers } from "./getAllMembers.ts";
import { getMember } from "./getMember.ts";

const memberRouter = new Router();

memberRouter
    .get("/members", (context: Context) => getAllMembers(context))
    .get("/members/:id", (context: Context) => getMember(context));

export default memberRouter;