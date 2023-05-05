import { Application } from "oak/mod.ts";

import { members } from "./routes/members/index.ts";

const app = new Application();

app.use(members.routes());
app.use(members.allowedMethods());

await app.listen({ port: 8000, secure: true });