import { Application } from "https://deno.land/x/oak@v12.4.0/mod.ts";

import { memberRouter } from "./routes/members/index.ts";

const app = new Application();


app.use(memberRouter.routes());
app.use(memberRouter.allowedMethods());

await app.listen({ port: 8000, secure: true });