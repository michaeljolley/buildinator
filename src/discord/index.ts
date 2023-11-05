import * as path from 'path';
import * as fs from 'fs';
import {
  Client,
  Collection,
  GatewayIntentBits,
  Guild,
  GuildMember,
  GuildScheduledEvent,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventStatus,
  PartialGuildMember,
  TextChannel,
  VoiceState,
  Events as DiscordEvents,
  REST,
  Routes,
  EmbedBuilder,
  Colors,
} from 'discord.js';
import {titleCase} from 'title-case';
import {EventBus} from '../events';
import {
  Events,
  NOTION_EVENT_TYPE_BREW_WITH_ME,
  NOTION_EVENT_TYPE_TWITCH,
  OrbitActivities,
} from '../constants';
import {GatheringAttendee} from '../types/gatheringAttendee';
import {BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE} from './BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE';
import {LogArea, LogLevel, log} from '../log';
import {Orbit} from '../orbit';
import {BuildinatorConfig} from '../types/buildinatorConfig';
import {GatheringEvent} from '../types/gatheringEvent';
import {DiscordSayEvent} from '../types/discordSayEvent';
import {GitHubPullRequestEvent} from '../types/githubPullRequestEvent';
import {OnStreamEvent} from '../types/events/onStreamEvent';

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

class DiscordClient extends Client {
  commands: Collection<
    string,
    {
      data: any;
      command: {execute: (interaction: any) => Promise<void>};
    }
  > = new Collection();
}

/**
 * The Discord class is static for the entire application. It is responsible for
 * listening to events in Discord and raising them to the EventBus. It also
 * listens to events in the EventBus in order to update Discord.
 */
export default abstract class Discord {
  private static _client = new DiscordClient({
    intents: DISCORD_INTENTS,
  });

  private static _attendees: Record<string, GatheringAttendee> = {};
  private static _config: BuildinatorConfig;

  /**
   * Initializes the Discord client and registers event handlers.
   */
  static async init(config: BuildinatorConfig): Promise<void> {
    this._config = config;
    this._client.commands = new Collection();

    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const command = require(filePath).default;
      if ('data' in command && 'execute' in command) {
        this._client.commands.set(command.data.name, {
          data: command.data,
          command,
        });
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
        );
      }
    }

    // Register any EventBus event handlers within this on 'ready' event.
    this._client.on(DiscordEvents.ClientReady, async () => {
      EventBus.eventEmitter.on(
        Events.GatheringScheduled,
        this.gatheringScheduledHandler.bind(this),
      );
      EventBus.eventEmitter.on(
        Events.PullRequestMerged,
        this.pullRequestMergedHandler.bind(this),
      );
      EventBus.eventEmitter.on(
        Events.DiscordSay,
        this.discordSayHandler.bind(this),
      );

      await this.registerDiscordEventListeners();
      await this.joinBrewWithMeChannel();
    });
    this._client.on(DiscordEvents.InteractionCreate, async interaction => {
      if (!interaction.isChatInputCommand()) return;

      const command = (interaction.client as DiscordClient).commands.get(
        interaction.commandName,
      );

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`,
        );
        return;
      }

      try {
        await command.command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          });
        }
      }
    });

    const rest = new REST().setToken(this._config.DISCORD_TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(
        this._config.DISCORD_CLIENT_ID,
        this._config.DISCORD_GUILD_ID,
      ),
      {body: this._client.commands.map(c => c.data.toJSON())},
    );

    await this._client.login(this._config.DISCORD_TOKEN);

    EventBus.eventEmitter.addListener(
      Events.OnStreamStart,
      (onStreamEvent: OnStreamEvent) => this.onStreamStart(onStreamEvent),
    );
  }

  /**
   * Register any Discord event listeners here.
   */
  static async registerDiscordEventListeners(): Promise<void> {
    this._client.on(
      'guildScheduledEventUpdate',
      this.guildScheduledEventUpdateHandler.bind(this),
    );
    this._client.on('guildMemberAdd', this.guildMemberAddHandler.bind(this));
    this._client.on(
      'guildMemberRemove',
      this.guildMemberRemoveHandler.bind(this),
    );
  }

  /**
   * Handle updates to Discord scheduled events.
   * @param oldGuildScheduledEvent Old version of the scheduled event
   * @param newGuildScheduledEvent Updated version of the scheduled event
   */
  static async guildScheduledEventUpdateHandler(
    oldGuildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus> | null,
    newGuildScheduledEvent: GuildScheduledEvent<GuildScheduledEventStatus>,
  ): Promise<void> {
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
    let existingCount = 0;
    if (existingAttendees) {
      for (const m of existingAttendees) {
        this._attendees[m.id] = {
          memberId: m.id,
          join: new Date(),
          durationInMinutes: 0,
        };
        existingCount++;
      }
    }
    log(
      LogLevel.Info,
      LogArea.Discord,
      `Scheduled Event started: ${newGuildScheduledEvent.name} (${existingCount} initial attendees)`,
    );
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
              description: `Attended ${
                newGuildScheduledEvent.name
              } for ${Math.round(totalDurationInMinutes)} minutes`,
              activity_type: 'buildinator',
              activity_type_key: OrbitActivities.BrewWithMe,
              link: `https://discord.com/channels/${this._config.DISCORD_GUILD_ID}/${this._config.DISCORD_CHANNEL_ID_BREW_WITH_ME}`,
              key: `discord:brew_with_me:${member.id}:${new Date()
                .toISOString()
                .slice(0, 10)
                .replace('-', '.')}}`,
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
        `${membersToReview.length} members attended ${newGuildScheduledEvent.name}.`,
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
    try {
      if (
        gathering.type === NOTION_EVENT_TYPE_TWITCH ||
        gathering.type === NOTION_EVENT_TYPE_BREW_WITH_ME
      ) {
        if (gathering.releaseDateStart && gathering.releaseDateEnd) {
          // If the Notion event has a `discordEventId`, we've already created
          // it in Discord. In that event, we need to update/delete the event
          // in Discord.
          !gathering.discordEventId || gathering.discordEventId?.length === 0
            ? await this.createScheduledEvent(gathering)
            : await this.updateScheduledEvent(gathering);
        }
      }
    } catch (error) {
      log(
        LogLevel.Error,
        LogArea.Discord,
        `gatheringScheduledHandler: ${error}`,
      );
    }
  }

  static async guildMemberAddHandler(member: GuildMember) {
    const memberName = member.nickname || member.user.username;

    log(LogLevel.Info, LogArea.Discord, `${memberName} has joined the server!`);
    await this.discordSayHandler({
      type: 'guildMemberAdd',
      channelId: this._config.DISCORD_CHANNEL_ID_MOD_LOG as string,
      message: `Heyo ${memberName} has joined the server! Be sure to welcome them in #general or #introductions.`,
    });

    const welcome = (
      strings: TemplateStringsArray,
      ...params: GuildMember[]
    ) => {
      return strings
        .map((str, index) => {
          `${str}${params[index] !== undefined ? params[index] : ''}`;
        })
        .join('');
    };

    const messages = [
      welcome`We're in luck! ${member} is here to fix all our bugs. But first, what's your programming language of choice?`,
      welcome`Awe snap. ${member} is here to write code and chew bubble gum. And they're all out of bubble gum.`,
      welcome`Behold ye peasants, ${member} has come to rule our server with an iron fist. Okay, maybe not. But if you were, what would your title be?`,
      welcome`Check it out! ${member} is coming in hot. Quick ${member}, you're sitting down for a serious coding session. What's your drink of choice?`,
      welcome`Finally, ${member} has joined us. Okay ${member}, we're having a meetup and you have to order the pizza. What toppings are you getting?`,
      welcome`We've been waiting for you ${member}. We're divided on whether someone should always write unit tests for code. What's your vote? Always, never, or it depends.`,
      welcome`Fun fact: Y2K was much ado about nothing all because of the efforts of ${member}. Now is our chance to thank them for their efforts.`,
      welcome`Look! ${member} is here to be a tie-breaker. ${member}, we're having a debate. Is a hot dog a sandwich?`,
      welcome`Thank goodness ${member} is here to save the day. We're having a debate. Tabs or spaces?`,
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    await this.discordSayHandler({
      type: 'guildMemberAdd',
      channelId: this._config.DISCORD_CHANNEL_ID_INTRO as string,
      message: randomMessage,
    });
  }

  static async guildMemberRemoveHandler(
    member: GuildMember | PartialGuildMember,
  ) {
    log(
      LogLevel.Info,
      LogArea.Discord,
      `${member.nickname || member.user.username} has left the server!`,
    );
    await this.discordSayHandler({
      type: 'guildMemberRemove',
      channelId: this._config.DISCORD_CHANNEL_ID_MOD_LOG as string,
      message: `Goodbye ${
        member.nickname || member.user.username
      }! They've left the server.`,
    });
  }

  /**
   * Sends a message to Discord based on the event payload.
   * @param discordSayEvent An object describing what to say in Discord
   */
  static async discordSayHandler(discordSayEvent: DiscordSayEvent) {
    try {
      const guild = await this.getGuild();
      if (guild) {
        const channel = (await guild.channels.cache.get(
          discordSayEvent.channelId,
        )) as TextChannel;
        if (channel) {
          await channel.send({
            content: discordSayEvent.message,
            embeds: discordSayEvent.embeds,
          });
        }
      }
    } catch (error) {
      log(
        LogLevel.Error,
        LogArea.Discord,
        `Error sending message in Discord ${discordSayEvent.type}}\n${error}`,
      );
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
        const image = await this.getGatheringCoverImage(gathering);

        // The event was found, so update it.
        const updatedEvent = discordEvent.edit({
          name: gathering.name,
          description: gathering.description as string,
          scheduledStartTime: gathering.releaseDateStart as string,
          scheduledEndTime: gathering.releaseDateEnd,
          image,
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
      const titleString = encodeURI(gathering.name.replace(/,/g, '%2C'));

      const coverImageUrl =
        gathering.type === NOTION_EVENT_TYPE_BREW_WITH_ME
          ? BUILD_WITH_ME_DISCORD_EVENT_COVER_IMAGE
          : `https://res.cloudinary.com/dk3rdh3yo/image/upload/g_south_west,x_40,y_40,w_700,c_fit,co_white,l_text:Roboto_48_bold:${titleString}/website-assets/800x320.png`;

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

  static async onStreamStart(onStreamEvent: OnStreamEvent): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(onStreamEvent.stream?.title)
      .setURL('https://twitch.tv/baldbeardedbuilder')
      .setAuthor({
        name: 'Bald Bearded Builder',
        url: 'https://twitch.tv/baldbeardedbuilder',
        iconURL:
          'https://res.cloudinary.com/dk3rdh3yo/image/upload/v1695143445/my-head.png',
      })
      .setColor(Colors.DarkPurple)
      .setThumbnail(
        'https://res.cloudinary.com/dk3rdh3yo/image/upload/v1695143445/my-head.png',
      )
      .setImage(
        onStreamEvent.stream?.thumbnail_url
          .replace('{width}', '1280')
          .replace('{height}', '720'),
      )
      .setFields({
        name: 'Viewers',
        value: onStreamEvent.stream?.viewer_count.toString(),
      });

    const sayEventMessage = {
      channelId: this._config.DISCORD_CHANNEL_ID_ANNOUNCEMENTS,
      message: `Hey <@&719759562978230323>! It's time to do the do. We're live on Twitch right now. Get to https://twitch.tv/baldbeardedbuilder to join in the fun!`,
      type: 'streamStart',
      embeds: [embed],
    } as DiscordSayEvent;

    EventBus.eventEmitter.emit(Events.DiscordSay, sayEventMessage);
  }
}
