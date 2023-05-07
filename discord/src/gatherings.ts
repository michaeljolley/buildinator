import { Types } from "npm:ably@1.2.39";
import { Bot, ScheduledEvent, ScheduledEventEntityType, createScheduledEvent, getScheduledEvent } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { GatheringEvent } from "../../shared/ably/index.ts";

const DISCORD_GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");
const DISCORD_CHANNEL_ID_BREW_WITH_ME = Deno.env.get("DISCORD_CHANNEL_ID_BREW_WITH_ME");
const PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK = Deno.env.get("PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK");

export async function gatheringStartHandler(bot: Bot, message: Types.Message) {
    console.log("Received: " + message.data);
}

export async function gatheringEndHandler(bot: Bot, message: Types.Message) {
    console.log("Received: " + message.data);
}

export async function gatheringScheduledHandler(bot: Bot, message: Types.Message) {

    const gathering = JSON.parse(message.data) as GatheringEvent;

    let discordEvent: ScheduledEvent | undefined;

    if (gathering.discordEventId) {
        // Update the event in Discord
        discordEvent = await getScheduledEvent(bot, DISCORD_GUILD_ID as string, gathering.discordEventId);

    } else {
        // If the event type is a stream or brew with me, then we need to create a Discord event.
        if (gathering.type === "Stream" || gathering.type === "Brew With Me") {
            if (gathering.releaseDateStart && gathering.releaseDateEnd) {
                discordEvent = await createScheduledEvent(bot, DISCORD_GUILD_ID as string, {
                    name: gathering.name,
                    description: gathering.description as string,
                    scheduledStartTime: (new Date(gathering.releaseDateStart as string)).getTime(),
                    scheduledEndTime: (new Date(gathering.releaseDateEnd as string)).getTime(),
                    entityType: gathering.type === "Stream" ? ScheduledEventEntityType.External : ScheduledEventEntityType.Voice,
                    location: gathering.type === "Stream" ? "https://twitch.tv/baldbeardedbuilder" : undefined,
                    channelId: gathering.type === "Stream" ? undefined : DISCORD_CHANNEL_ID_BREW_WITH_ME as string,
                });

                // Publish new Discord Event Id to Pipedream/Notion
                await fetch(PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK as string, {
                    method: "POST",
                    body: JSON.stringify({
                        notionPageId: gathering.id,
                        discordEventId: discordEvent.id
                    })
                });
            }
        }
    }
}
