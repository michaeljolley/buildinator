import { Application } from "https://deno.land/x/oak@v12.4.0/mod.ts";

import { members } from "./routes/members/index.ts";

const app = new Application();

app.use(members.routes());
app.use(members.allowedMethods());

await app.listen({ port: 8000, secure: true });