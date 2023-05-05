import type { Context } from "oak/mod.ts";

export async function getAllMembers(context: Context) {
    return new Response("Get all members");
}