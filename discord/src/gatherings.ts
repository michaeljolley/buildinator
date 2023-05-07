import { Types } from "npm:ably@1.2.39";
import { Bot, ScheduledEvent, ScheduledEventEntityType, getScheduledEvent } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { GatheringEvent } from "../../shared/ably/index.ts";
import { createScheduledEvent } from "./overrides/createScheduledEvent.ts";

const DISCORD_GUILD_ID = Deno.env.get("DISCORD_GUILD_ID");
const DISCORD_CHANNEL_ID_BREW_WITH_ME = Deno.env.get("DISCORD_CHANNEL_ID_BREW_WITH_ME");
const PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK = Deno.env.get("PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK");

const BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE = "https://res.cloudinary.com/dk3rdh3yo/image/upload/v1683497900/discord_brew_with_me_cover.png";

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

                const image = gathering.type === "Stream" ? undefined : brewWithMeImage()

                discordEvent = await createScheduledEvent(bot, DISCORD_GUILD_ID as string, {
                    name: gathering.name,
                    description: gathering.description as string,
                    scheduled_start_time: gathering.releaseDateStart,
                    scheduled_end_time: gathering.releaseDateEnd,
                    entity_type: gathering.type === "Stream" ? ScheduledEventEntityType.External : ScheduledEventEntityType.Voice,
                    entity_metadata: {
                        location: gathering.type === "Stream" ? "https://twitch.tv/baldbeardedbuilder" : undefined
                    },
                    channel_id: (gathering.type === "Stream" ? null : DISCORD_CHANNEL_ID_BREW_WITH_ME as string),
                    image
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

function brewWithMeImage() {
    fetch(BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE)
        .then((res) => res.blob())
        .then((blob) => {
            // Read the Blob as DataURL using the FileReader API
            const reader = new FileReader();
            reader.onloadend = () => {
                return reader.result;
            };
            reader.readAsDataURL(blob);
        });
}
