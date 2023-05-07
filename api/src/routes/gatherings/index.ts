import { Router } from "https://deno.land/x/oak@v12.4.0/mod.ts";

import gatheringUpdated from "./gatheringUpdated.ts";

const gatheringRouter = new Router();

gatheringRouter
    .put("/gatherings", gatheringUpdated);

export { gatheringRouter };