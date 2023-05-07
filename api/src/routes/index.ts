import { Application } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import { gatheringRouter } from "./gatherings/index.ts";

export default function registerRoutes(app: Application) {
    app.use(gatheringRouter.routes());
    app.use(gatheringRouter.allowedMethods());
}