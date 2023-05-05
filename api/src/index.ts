import { Application } from "https://deno.land/x/oak@v12.4.0/mod.ts";

import memberRoutes from "./routes/members/index.ts";

const app = new Application();


app.use(memberRoutes.routes());
app.use(memberRoutes.allowedMethods());

await app.listen({ port: 8000, secure: true });