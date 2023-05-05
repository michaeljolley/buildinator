import type { Context } from "https://deno.land/x/oak@v12.4.0/mod.ts";

export async function getMember(context: Context) {
    const id = context?.params?.id

    return new Response(`Get member ${id}`);
}