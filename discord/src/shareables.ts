import { Types } from "npm:ably@1.2.39";
import { Bot } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export async function shareableCreatedHandler(bot: Bot, message: Types.Message) {
    console.log("Received: " + message.data);
}