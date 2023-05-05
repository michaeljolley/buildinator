import type { Context } from "oak/mod.ts";

export async function getMember(context: Context) {
    const id = context?.params?.id

    return new Response(`Get member ${id}`);
}