import { APIEmbed, JSONEncodable } from "discord.js";

export type DiscordSayEvent = {
    channelId: string;
    message: string;
    type: string;
    embeds?: (APIEmbed | JSONEncodable<APIEmbed>)[]
}