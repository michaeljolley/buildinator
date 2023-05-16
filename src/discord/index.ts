import {
  Client,
  GatewayIntentBits,
  Guild,
  GuildScheduledEvent,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventStatus,
  VoiceState,
} from 'discord.js';
import {titleCase} from 'title-case';
import {EventBus} from '../events';
import {
  DISCORD_CHANNEL_ID_BREW_WITH_ME,
  DISCORD_GUILD_ID,
  DISCORD_ROLE_BUILDERS,
  DISCORD_TOKEN,
  Events,
  PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK,
} from '../constants';
import {GatheringAttendee} from '../types/gatheringAttendee';
import {GatheringEvent} from '../types/gatheringEvent';
import {BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE} from './BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE';
import {LogArea, LogLevel, log} from '../log';

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

const NOTION_EVENT_TYPE_TWITCH = 'Twitch';
const NOTION_EVENT_TYPE_BREW_WITH_ME = 'Brew With Me';

/**
 * The Discord class is static for the entire application. It is responsible for
 * listening to events in Discord and raising them to the EventBus. It also
 * listens to events in the EventBus in order to update Discord.
 */
export default abstract class Discord {
  private static _client = new Client({
    intents: DISCORD_INTENTS,
  });

  private static _attendees: Record<string, GatheringAttendee> = {};

  /**
   * Initializes the Discord client and registers event handlers.
   */
  static async init(): Promise<void> {
    // Register any EventBus event handlers within this on 'ready' event.
    this._client.on('ready', async () => {
      EventBus.eventEmitter.on(
        Events.GatheringScheduled,
        this.gatheringScheduledHandler.bind(this),
      );

      await this.registerScheduledEventListeners();
      await this.joinBrewWithMeChannel();
    });

    await this._client.login(DISCORD_TOKEN);
  }

  static async registerScheduledEventListeners(): Promise<void> {
    this._client.on(
      'guildScheduledEventUpdate',
      this.handleGuildScheduledEventUpdate.bind(this),
    );
  }

  static async handleGuildScheduledEventUpdate(
    oldGuildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus> | null,
    newGuildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus>,
  ): Promise<void> {
    if (newGuildScheduledEvent.channelId === DISCORD_CHANNEL_ID_BREW_WITH_ME) {
      if (
        newGuildScheduledEvent.status === GuildScheduledEventStatus.Completed
      ) {
        const guild = await this.getGuild();

        if (guild) {
          for (const [memberId, gatheringAttendee] of Object.entries(
            this._attendees,
          )) {
            let totalDurationInMinutes = gatheringAttendee.durationInMinutes;

            if (gatheringAttendee.join) {
              totalDurationInMinutes +=
                (new Date().getTime() - gatheringAttendee.join.getTime()) /
                1000 /
                60;
            }

            if (totalDurationInMinutes >= 30) {
              const member = await guild.members.fetch(memberId);

              if (!member.roles.cache.has(DISCORD_ROLE_BUILDERS as string)) {
                member.roles.add(DISCORD_ROLE_BUILDERS as string);
              }
            }
          }

          this._attendees = {};
        }
      }
    }
  }

  static async joinBrewWithMeChannel(): Promise<void> {
    const guild = await this.getGuild();

    if (guild) {
      const brewWithMeChannel = await guild.channels.fetch(
        DISCORD_CHANNEL_ID_BREW_WITH_ME as string,
      );
      if (brewWithMeChannel && brewWithMeChannel.isVoiceBased()) {
        this._client.on(
          'voiceStateUpdate',
          await this.voiceStateUpdateHandler.bind(this),
        );
      }
    }
  }

  static async voiceStateUpdateHandler(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    const guild = await this.getGuild();

    if (guild) {
      const scheduledEvents = await guild.scheduledEvents.fetch();
      const activeEvent = scheduledEvents.find(event => {
        return (
          event.channelId === DISCORD_CHANNEL_ID_BREW_WITH_ME &&
          event.isActive()
        );
      });

      if (activeEvent) {
        // If an event is active:
        if (newState.member) {
          const member = this._attendees[newState.member.id] || {
            join: new Date(),
            durationInMinutes: 0,
          };

          // If the newState comes in with a channelId, it's a join event.
          if (newState.channelId === DISCORD_CHANNEL_ID_BREW_WITH_ME) {
            member.join = new Date();
          }
          // otherwise, it's a leave event
          else {
            if (member.join) {
              member.durationInMinutes +=
                (new Date().getTime() - member.join.getTime()) / 1000 / 60;
              member.join = undefined;
            }
          }

          this._attendees[newState.member.id] = member;
        }
      }
    }
  }

  /**
   * Creates/updates/deletes Discord scheduled events based on events
   * saved in Notion.
   * @param gathering A community event from Notion
   */
  static async gatheringScheduledHandler(gathering: GatheringEvent) {
    // If the event type is a stream or brew with me, then we need
    // to create a Discord event. We also need to make sure that the
    // event has a start and end date.
    if (
      gathering.type === NOTION_EVENT_TYPE_TWITCH ||
      gathering.type === NOTION_EVENT_TYPE_BREW_WITH_ME
    ) {
      if (gathering.releaseDateStart && gathering.releaseDateEnd) {
        // If the Notion event has a `discordEventId`, we've already created
        // it in Discord. In that event, we need to update/delete the event
        // in Discord.
        gathering.discordEventId === null
          ? await this.createScheduledEvent(gathering)
          : await this.updateScheduledEvent(gathering);
      }
    }
  }

  /**
   * Creates a Discord scheduled event based on the provided Notion event.
   * @param gathering Notion event to create in Discord
   * @returns A Discord scheduled event or undefined.
   */
  static async createScheduledEvent(
    gathering: GatheringEvent,
  ): Promise<GuildScheduledEvent | undefined> {
    // Get the cover image for the event
    const image = await this.getGatheringCoverImage(gathering);

    try {
      const guild = await this.getGuild();
      if (guild) {
        const discordEvent = await guild.scheduledEvents.create({
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

        log(
          LogLevel.Info,
          LogArea.Discord,
          `Created Discord event ${discordEvent.name}} (${discordEvent.id})`,
        );

        // Publish new Discord Event Id to Pipedream/Notion
        await fetch(PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK as string, {
          method: 'POST',
          body: JSON.stringify({
            notionPageId: gathering.id,
            discordEventId: discordEvent?.id,
          }),
        });
      }
    } catch (error) {
      log(
        LogLevel.Error,
        LogArea.Discord,
        `Error creating Discord event ${gathering.name}}\n${error}`,
      );
    }

    return undefined;
  }

  /**
   * Updates a Discord scheduled event with the latest information from Notion.
   * @param gathering Notion gathering event
   * @returns The updated Discord scheduled event or undefined.
   */
  static async updateScheduledEvent(
    gathering: GatheringEvent,
  ): Promise<GuildScheduledEvent | undefined> {
    try {
      // Get the Discord event from Discord to update it.
      const discordEvent = await this.getScheduledEvent(
        gathering.discordEventId as string,
      );

      // If the event wasn't found in Discord, log it and return undefined.
      if (!discordEvent) {
        log(
          LogLevel.Info,
          LogArea.Discord,
          `Discord event '${gathering.name}' not found. Id: ${gathering.discordEventId}`,
        );
        return undefined;
      }

      // If the event was canceled in Notion, cancel it in Discord. Otherwise,
      // update it in Discord.
      if (gathering.status === 'Canceled') {
        const deletedEvent = await discordEvent.delete();

        if (deletedEvent !== undefined) {
          log(
            LogLevel.Info,
            LogArea.Discord,
            `Canceled Discord event '${gathering.name}' (${gathering.id})`,
          );
        }
      } else {
        // The event was found, so update it.
        const updatedEvent = discordEvent.edit({
          name: gathering.name,
          description: gathering.description as string,
          scheduledStartTime: gathering.releaseDateStart as string,
          scheduledEndTime: gathering.releaseDateEnd,
        });

        if (updatedEvent !== undefined) {
          log(
            LogLevel.Info,
            LogArea.Discord,
            `Updated Discord event '${gathering.name}' (${gathering.id})`,
          );
        }
      }
    } catch (error) {
      log(
        LogLevel.Error,
        LogArea.Discord,
        `Error updating Discord event ${gathering.name}}\n${error}`,
      );
    }

    return undefined;
  }

  /**
   * Retrieves the Discord guild from the Discord API.
   * @returns The Discord guild or undefined.
   */
  static async getGuild(): Promise<Guild | undefined> {
    try {
      return await this._client.guilds.fetch(DISCORD_GUILD_ID as string);
    } catch (error) {
      log(
        LogLevel.Error,
        LogArea.Discord,
        `Error retrieving Discord guild ${DISCORD_GUILD_ID}\n${error}`,
      );
    }
  }

  /**
   * Retrieves an Discord scheduled event from the Discord API.
   * @param discordEventId Identifier of the event in Discord
   * @returns A Discord scheduled event or undefined.
   */
  static async getScheduledEvent(
    discordEventId: string,
  ): Promise<GuildScheduledEvent | undefined> {
    try {
      const guild = await this.getGuild();
      if (guild) {
        return await guild.scheduledEvents.fetch(discordEventId);
      }
    } catch (error) {
      log(
        LogLevel.Error,
        LogArea.Discord,
        `Error retrieving Discord scheduled event ${discordEventId}\n${error}`,
      );
    }
  }

  /**
   * Get a data URI for the cover image for the event.
   * @param gathering Notion event
   * @returns The cover image as a data URI or undefined.
   */
  static async getGatheringCoverImage(
    gathering: GatheringEvent,
  ): Promise<string | undefined> {
    try {
      const titleString = `/l_text:Cairo_56_bold_line_spacing_-45:${encodeURI(
        titleCase(gathering.name),
      )},g_north_west,x_65,y_255,w_900,c_fit,co_rgb:FFFFFF`;
      const urlString = `/l_text:Cairo_24_regular_letter_spacing_4:twitch.tv%5Cbaldbeardedbuilder,g_north_west,x_65,y_215,co_rgb:0AC2C2`;

      const coverImageUrl =
        gathering.type === NOTION_EVENT_TYPE_BREW_WITH_ME
          ? BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE
          : `https://res.cloudinary.com/dk3rdh3yo/image/upload/b_rgb:000${urlString}${titleString}/ograph-base.png`;

      const response = await fetch(coverImageUrl);
      const respBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(respBuffer).toString('base64');
      const mimetype = response.headers.get('content-type');
      return `data:${mimetype};base64,${base64}`;
    } catch (error) {
      log(
        LogLevel.Error,
        LogArea.Discord,
        `Error retrieving cover image for '${gathering.name}'\n${error}`,
      );
    }
    return undefined;
  }
}
