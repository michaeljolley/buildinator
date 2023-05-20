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
import { titleCase } from 'title-case';
import { EventBus } from '../events';
import { Events, NOTION_EVENT_TYPE_BREW_WITH_ME, NOTION_EVENT_TYPE_TWITCH, OrbitActivities } from '../constants';
import { GatheringAttendee } from '../types/gatheringAttendee';
import { GatheringEvent } from '../types/gatheringEvent';
import { BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE } from './BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE';
import { LogArea, LogLevel, log } from '../log';
import { GitHubPullRequestEvent } from '../types/githubPullRequestEvent';
import { Orbit } from '../orbit';
import { BuildinatorConfig } from '../types/buildinatorConfig';

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
  private static _config: BuildinatorConfig;

  /**
   * Initializes the Discord client and registers event handlers.
   */
  static async init(config: BuildinatorConfig): Promise<void> {
    this._config = config;

    // Register any EventBus event handlers within this on 'ready' event.
    this._client.on('ready', async () => {
      EventBus.eventEmitter.on(
        Events.GatheringScheduled,
        this.gatheringScheduledHandler.bind(this),
      );
      EventBus.eventEmitter.on(
        Events.PullRequestMerged,
        this.pullRequestMergedHandler.bind(this),
      );

      await this.registerDiscordEventListeners();
      await this.joinBrewWithMeChannel();
    });

    await this._client.login(this._config.DISCORD_TOKEN);
  }

  /**
   * Register any Discord event listeners here.
   */
  static async registerDiscordEventListeners(): Promise<void> {
    this._client.on(
      'guildScheduledEventUpdate',
      this.handleGuildScheduledEventUpdate.bind(this),
    );
  }

  /**
   * Handle updates to Discord scheduled events.
   * @param oldGuildScheduledEvent Old version of the scheduled event
   * @param newGuildScheduledEvent Updated version of the scheduled event
   */
  static async handleGuildScheduledEventUpdate(
    oldGuildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus> | null,
    newGuildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus>,
  ): Promise<void> {
    log(
      LogLevel.Info,
      LogArea.Discord,
      `Scheduled Event updated: ${newGuildScheduledEvent.name} (${newGuildScheduledEvent.status})`,
    );

    // If the event is a Brew With Me event, and it's completed, we need to
    // review any attendees and possibly assign them the Builders role.
    if (
      newGuildScheduledEvent.channelId ===
      this._config.DISCORD_CHANNEL_ID_BREW_WITH_ME
    ) {
      switch (newGuildScheduledEvent.status) {
        case GuildScheduledEventStatus.Active:
          this.startEvent(newGuildScheduledEvent);
          break;
        case GuildScheduledEventStatus.Completed:
          await this.endEvent(newGuildScheduledEvent);
          break;
        default:
          break;
      }
    }
  }

  private static startEvent(
    newGuildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus>,
  ) {
    const existingAttendees = newGuildScheduledEvent.channel?.members.values();
    if (existingAttendees) {
      for (const m of existingAttendees) {
        this._attendees[m.id] = {
          memberId: m.id,
          join: new Date(),
          durationInMinutes: 0,
        };
      }
    }
  }

  private static async endEvent(
    newGuildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus>,
  ) {
    const guild = await this.getGuild();
    if (guild) {
      const membersToReview: string[] = [];

      for (const [memberId, gatheringAttendee] of Object.entries(
        this._attendees,
      )) {
        let totalDurationInMinutes = gatheringAttendee.durationInMinutes;

        // Update the duration for each attendee
        if (gatheringAttendee.join) {
          totalDurationInMinutes +=
            (new Date().getTime() - gatheringAttendee.join.getTime()) /
            1000 /
            60;
        }

        const member = await guild.members.fetch(memberId);

        // If the attendee was around for more than 30 minutes (Brew With Me
        // events are 1 hour long), assign the Builders role.
        if (totalDurationInMinutes >= 30) {
          membersToReview.push(member.nickname || member.user.username);
          member.roles.add(this._config.DISCORD_ROLE_BUILDERS as string);

          if (
            !member.roles.cache.has(
              this._config.DISCORD_ROLE_BUILDERS as string,
            )
          ) {
            await member.roles.add(
              this._config.DISCORD_ROLE_BUILDERS as string,
            );
          }
        }

        // If the attendee was around for at least 15 minutes, log their
        // attendance in Orbit.
        if (totalDurationInMinutes >= 15) {
          await Orbit.addActivity(
            {
              title: `Attended ${newGuildScheduledEvent.name}`,
              description: `Attended ${newGuildScheduledEvent.name} for ${totalDurationInMinutes} minutes`,
              activity_type: 'buildinator',
              activity_type_key: OrbitActivities.BrewWithMe,
              link: `https://discord.com/channels/${this._config.DISCORD_GUILD_ID}/${this._config.DISCORD_CHANNEL_ID_BREW_WITH_ME}`,
            },
            {
              uid: member.id,
              source: 'discord',
            },
          );
        }
      }

      log(
        LogLevel.Info,
        LogArea.Discord,
        `${membersToReview.length} members attended ${newGuildScheduledEvent.name}.}`,
      );

      this._attendees = {};
    }
  }

  /**
   * Register listening to events on the Brew With me channel
   */
  static async joinBrewWithMeChannel(): Promise<void> {
    const guild = await this.getGuild();

    if (guild) {
      const brewWithMeChannel = await guild.channels.fetch(
        this._config.DISCORD_CHANNEL_ID_BREW_WITH_ME,
      );
      if (brewWithMeChannel && brewWithMeChannel.isVoiceBased()) {
        this._client.on(
          'voiceStateUpdate',
          await this.voiceStateUpdateHandler.bind(this),
        );
      }
    }
  }

  /**
   * Handles voice state changes to members in the Brew With Me channel
   * @param oldState Old voice state of the member
   * @param newState New voice state of the member
   */
  static async voiceStateUpdateHandler(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    const guild = await this.getGuild();

    if (guild) {
      const scheduledEvents = await guild.scheduledEvents.fetch();
      const activeEvent = scheduledEvents.find(event => {
        return (
          event.channelId === this._config.DISCORD_CHANNEL_ID_BREW_WITH_ME &&
          event.isActive()
        );
      });

      if (activeEvent) {
        // If an event is active:
        if (newState.member) {
          const member = this._attendees[newState.member.id] || {
            memberId: newState.member.id,
            join: new Date(),
            durationInMinutes: 0,
          };

          // If the newState comes in with a channelId, it's a join event.
          if (
            newState.channelId === this._config.DISCORD_CHANNEL_ID_BREW_WITH_ME
          ) {
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

  static async pullRequestMergedHandler(
    pullRequestEvent: GitHubPullRequestEvent,
  ) {
    log(
      LogLevel.Info,
      LogArea.Discord,
      `Pull request merged: ${JSON.stringify(pullRequestEvent)}`,
    );
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
              : (this._config.DISCORD_CHANNEL_ID_BREW_WITH_ME as string),
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
          `Created Discord event ${discordEvent.name} (${discordEvent.id})`,
        );

        // Publish new Discord Event Id to Pipedream/Notion
        await fetch(
          this._config.PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK as string,
          {
            method: 'POST',
            body: JSON.stringify({
              notionPageId: gathering.id,
              discordEventId: discordEvent?.id,
            }),
          },
        );
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
      return await this._client.guilds.fetch(
        this._config.DISCORD_GUILD_ID as string,
      );
    } catch (error) {
      log(
        LogLevel.Error,
        LogArea.Discord,
        `Error retrieving Discord guild ${this._config.DISCORD_GUILD_ID}\n${error}`,
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
