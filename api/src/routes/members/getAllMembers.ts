import type { Context } from "https://deno.land/x/oak@v12.4.0/mod.ts";

export async function getAllMembers(context: Context) {
    context.response.body = "Get all members";
    context.response.status = 200;
}