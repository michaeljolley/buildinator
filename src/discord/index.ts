import {
  Client,
  GatewayIntentBits,
  GuildScheduledEvent,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
} from 'discord.js';
import { EventBus } from '../events';
import {
  DISCORD_CHANNEL_ID_BREW_WITH_ME,
  DISCORD_GUILD_ID,
  DISCORD_TOKEN,
  Events,
  PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK,
} from '../constants';
import { GatheringEvent } from '../types/gatheringEvent';
import { BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE } from './BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE';
import { LogArea, LogLevel, log } from '../log';

const DISCORD_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildInvites,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildScheduledEvents,
];

const NOTION_EVENT_TYPE_TWITCH = "Twitch";
const NOTION_EVENT_TYPE_BREW_WITH_ME = "Brew With Me";

export default abstract class Discord {
  private static _client = new Client({
    intents: DISCORD_INTENTS,
  });

  static async init(): Promise<void> {
    this._client.on('ready', () => {
      EventBus.eventEmitter.on(
        Events.GatheringScheduled,
        this.gatheringScheduledHandler.bind(this),
      );
    });

    await this._client.login(DISCORD_TOKEN);
  }

  static async gatheringScheduledHandler(gathering: GatheringEvent) {

    let discordEvent: GuildScheduledEvent | undefined;

    if (gathering.discordEventId) {
      // Update the event in Discord
      discordEvent = await this.getScheduledEvent(gathering.discordEventId);

      if (discordEvent) {
        await this.updateScheduledEvent(discordEvent, gathering);
        log(LogLevel.Info, LogArea.Discord, `Updated Discord event ${gathering.name}} (${gathering.id})`);
      }

    } else {
      // If the event type is a stream or brew with me, then we need to create a Discord event.
      if (gathering.type === NOTION_EVENT_TYPE_TWITCH || gathering.type === NOTION_EVENT_TYPE_BREW_WITH_ME) {
        if (gathering.releaseDateStart && gathering.releaseDateEnd) {
          discordEvent = await this.createScheduledEvent(gathering);

          if (discordEvent) {
            log(LogLevel.Info, LogArea.Discord, `Created Discord event ${discordEvent.name}} (${discordEvent.id})`);

            // Publish new Discord Event Id to Pipedream/Notion
            await fetch(PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK as string, {
              method: 'POST',
              body: JSON.stringify({
                notionPageId: gathering.id,
                discordEventId: discordEvent?.id,
              }),
            });
          }
        }
      }
    }
  }

  static async createScheduledEvent(
    gathering: GatheringEvent,
  ): Promise<GuildScheduledEvent | undefined> {
    const image =
      gathering.type === 'Twitch' ? null : BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE;

    try {
      const guild = await this._client.guilds.fetch(DISCORD_GUILD_ID as string);
      return await guild.scheduledEvents.create({
        name: gathering.name,
        scheduledStartTime: gathering.releaseDateStart as string,
        scheduledEndTime: gathering.releaseDateEnd,
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        entityType:
          gathering.type === NOTION_EVENT_TYPE_TWITCH
            ? GuildScheduledEventEntityType.External
            : GuildScheduledEventEntityType.Voice,
        description: gathering.description as string,
        channel:
          gathering.type === NOTION_EVENT_TYPE_TWITCH
            ? undefined
            : (DISCORD_CHANNEL_ID_BREW_WITH_ME as string),
        entityMetadata: {
          location:
            gathering.type === NOTION_EVENT_TYPE_TWITCH
              ? 'https://twitch.tv/baldbeardedbuilder'
              : undefined,
        },
        image,
      });
    }
    catch (error) {
      log(LogLevel.Error, LogArea.Discord, `Error creating Discord event ${gathering.name}}`);
    }

    return undefined;
  }

  static async updateScheduledEvent(
    scheduledEvent: GuildScheduledEvent,
    gathering: GatheringEvent,
  ): Promise<GuildScheduledEvent | undefined> {
    try {
      return scheduledEvent.edit({
        name: gathering.name,
        description: gathering.description as string,
        scheduledStartTime: gathering.releaseDateStart as string,
        scheduledEndTime: gathering.releaseDateEnd,
      });
    }
    catch (error) {
      log(LogLevel.Error, LogArea.Discord, `Error updating Discord event ${gathering.name}}`);
    }

    return undefined;
  }

  static async getScheduledEvent(
    discordEventId: string,
  ): Promise<GuildScheduledEvent | undefined> {
    const guild = await this._client.guilds.fetch(DISCORD_GUILD_ID as string);
    return await guild.scheduledEvents.fetch(discordEventId);
  }
}
