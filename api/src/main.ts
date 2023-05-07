import { Application } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import registerRoutes from "./routes/index.ts";

const BUILDINATOR_PIPEDREAM_API_KEY = Deno.env.get("BUILDINATOR_PIPEDREAM_API_KEY");

const app = new Application();

// Validate requests
app.use(async (context, next) => {

    const apiKey = context.request.headers.get("x-buildinator-api-key");

    if (apiKey !== BUILDINATOR_PIPEDREAM_API_KEY) {
        context.response.status = 403;
        context.response.body = "Invalid API key";
        return;
    }

    await next();
});

registerRoutes(app);

await app.listen({ port: 8000 });
