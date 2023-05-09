import { Client, GatewayIntentBits, GuildScheduledEvent, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } from 'discord.js';
import { EventBus } from '../events';
import { DISCORD_CHANNEL_ID_BREW_WITH_ME, DISCORD_GUILD_ID, DISCORD_TOKEN, Events, PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK } from '../constants';
import { GatheringEvent } from '../types/gatheringEvent';

const DISCORD_INTENTS = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildScheduledEvents
];

export default abstract class Discord {

    private static _client = new Client({
        intents: DISCORD_INTENTS
    });

    static async init(): Promise<void> {

        this._client.on('ready', () => {
            EventBus.eventEmitter.on(Events.GatheringScheduled, this.gatheringScheduledHandler);
        });

        await this._client.login(DISCORD_TOKEN)
    }

    static async gatheringScheduledHandler({ data }: { data: string }) {

        const gathering = JSON.parse(data) as GatheringEvent;

        let discordEvent: GuildScheduledEvent | undefined;

        if (gathering.discordEventId) {
            // Update the event in Discord
            discordEvent = await this.getScheduledEvent(gathering.discordEventId);
        } else {
            // If the event type is a stream or brew with me, then we need to create a Discord event.
            if (gathering.type === "Stream" || gathering.type === "Brew With Me") {
                if (gathering.releaseDateStart && gathering.releaseDateEnd) {

                    discordEvent = await this.createScheduledEvent(gathering);

                    // Publish new Discord Event Id to Pipedream/Notion
                    await fetch(PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK as string, {
                        method: "POST",
                        body: JSON.stringify({
                            notionPageId: gathering.id,
                            discordEventId: discordEvent?.entityId
                        })
                    });
                }
            }
        }
    }

    static async createScheduledEvent(gathering: GatheringEvent): Promise<GuildScheduledEvent | undefined> {
        const image = gathering.type === "Stream" ? null : await this.brewWithMeImage();

        const guild = await this._client.guilds.fetch(DISCORD_GUILD_ID as string);
        return await guild.scheduledEvents.create({
            name: gathering.name,
            scheduledStartTime: gathering.releaseDateStart as string,
            scheduledEndTime: gathering.releaseDateEnd,
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityType: gathering.type === "Stream" ? GuildScheduledEventEntityType.External : GuildScheduledEventEntityType.Voice,
            description: gathering.description as string,
            channel: (gathering.type === "Stream" ? undefined : DISCORD_CHANNEL_ID_BREW_WITH_ME as string),
            entityMetadata: {
                location: gathering.type === "Stream" ? "https://twitch.tv/baldbeardedbuilder" : undefined
            },
            image
        });
    }

    static async getScheduledEvent(discordEventId: string): Promise<GuildScheduledEvent | undefined> {
        const guild = await this._client.guilds.fetch(DISCORD_GUILD_ID as string);
        return await guild.scheduledEvents.fetch(discordEventId);
    }

    private static async brewWithMeImage(): Promise<string | undefined> {
        try {
            const response = await fetch(BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    return resolve(reader.result as string);
                };
                reader.readAsDataURL(blob);
            });
        }
        catch (error) {
            console.log(error);
        }
        return undefined;
    }
}
