import { Types } from "npm:ably@1.2.39";
import { Bot, ScheduledEventEntityType, createScheduledEvent } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

const DISCORD_GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");
const DISCORD_CHANNEL_ID_BREW_WITH_ME = Deno.env.get("DISCORD_CHANNEL_ID_BREW_WITH_ME");

export async function gatheringStartHandler(bot: Bot, message: Types.Message) {
    console.log("Received: " + message.data);
}

export async function gatheringEndHandler(bot: Bot, message: Types.Message) {
    console.log("Received: " + message.data);
}

export async function gatheringScheduledHandler(bot: Bot, message: Types.Message) {

    await createScheduledEvent(bot, DISCORD_GUILD_ID as string, {
        name: "gathering name",
        description: "gathering description",
        scheduledStartTime: new Date(),
        scheduledEndTime: new Date(),
        entityType: ScheduledEventEntityType.Voice,
        location: "http://localhost",
        channelId: DISCORD_CHANNEL_ID_BREW_WITH_ME as string,
    });

}
