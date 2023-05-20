import { BuildinatorConfig } from '../types/buildinatorConfig';
import { LogArea, LogLevel, log } from '../log';
import { User } from '../types/user';
import { Stream } from '../types/stream';
import { GatheringEvent } from '../types/gatheringEvent';

export default class API {
  private twitchAPIEndpoint = 'https://api.twitch.tv/helix';
  private twitchAPIUserEndpoint = `${this.twitchAPIEndpoint}/users`;
  private twitchAPIStreamEndpoint = `${this.twitchAPIEndpoint}/streams`;
  private twitchAPIWebhookEndpoint = `${this.twitchAPIEndpoint}/eventsub/subscriptions`;
  private twitchAPIScheduleEndpoint = `${this.twitchAPIEndpoint}/schedule/segment`;

  private headers: Headers;
  private wsHeaders: Headers;
  private headersNoScope: Headers;
  private _config: BuildinatorConfig;

  constructor(config: BuildinatorConfig) {
    this._config = config;
    this.headers = new Headers([
      ["Authorization", `Bearer ${this._config.TWITCH_CHANNEL_AUTH_TOKEN}`],
      ['Content-Type', 'application/json'],
      ['Client-ID', this._config.TWITCH_CLIENT_ID]
    ]);
    this.wsHeaders = new Headers([
      ["Authorization", `Bearer ${this._config.TWITCH_BOT_AUTH_TOKEN}`],
      ['Content-Type', 'application/json'],
      ['Client-ID', this._config.TWITCH_CLIENT_ID]
    ]);
    this.headersNoScope = new Headers([
      ["Authorization", `Bearer ${this._config.TWITCH_BOT_AUTH_TOKEN_NO_SCOPE}`],
      ['Content-Type', 'application/json'],
      ['Client-ID', this._config.TWITCH_CLIENT_ID]
    ]);
  }

  /**
   * Registers all websocket subscriptions with Twitch directed to this instance of the bot
   */
  public async registerWebSocketSubscriptions(
    sessionId: string,
  ): Promise<void> {
    log(
      LogLevel.Info,
      LogArea.TwitchAPI,
      'Registering WebSocket subscriptions',
    );

    await this.registerFollowWSSubscription(sessionId);
    await this.registerStreamOnlineWSSubscription(sessionId);
    await this.registerStreamOfflineWSSubscription(sessionId);
  }

  private async registerFollowWSSubscription(sessionId: string): Promise<void> {
    try {
      const payload = {
        type: 'channel.follow',
        version: '2',
        condition: {
          broadcaster_user_id: this._config.TWITCH_CHANNEL_ID,
          moderator_user_id: this._config.TWITCH_BOT_CHANNEL_ID,
        },
        transport: {
          method: 'websocket',
          session_id: sessionId,
        },
      };

      const response = await fetch(this.twitchAPIWebhookEndpoint, {
        method: 'POST',
        headers: this.wsHeaders,
        body: JSON.stringify(payload),
      });
      log(
        LogLevel.Info,
        LogArea.TwitchAPI,
        `registerFollowWSSubscription - Response ${response.status}`,
      );
    } catch (err) {
      log(
        LogLevel.Error,
        LogArea.TwitchAPI,
        `registerFollowWSSubscription ${err}`,
      );
    }
  }

  private async registerStreamOnlineWSSubscription(
    sessionId: string,
  ): Promise<void> {
    try {
      const payload = {
        type: 'stream.online',
        version: '1',
        condition: { broadcaster_user_id: `${this._config.TWITCH_CHANNEL_ID}` },
        transport: { method: 'websocket', session_id: sessionId },
      };

      const response = await fetch(this.twitchAPIWebhookEndpoint, {
        method: 'POST',
        headers: this.headersNoScope,
        body: JSON.stringify(payload),
      });
      log(
        LogLevel.Info,
        LogArea.TwitchAPI,
        `registerStreamOnlineWSSubscription - Response = ${response.status}`,
      );
    } catch (err) {
      log(
        LogLevel.Error,
        LogArea.TwitchAPI,
        `registerStreamOnlineWSSubscription ${err}`,
      );
    }
  }

  private async registerStreamOfflineWSSubscription(
    sessionId: string,
  ): Promise<void> {
    try {
      const payload = {
        type: 'stream.offline',
        version: '1',
        condition: { broadcaster_user_id: `${this._config.TWITCH_CHANNEL_ID}` },
        transport: { method: 'websocket', session_id: sessionId },
      };

      const response = await fetch(this.twitchAPIWebhookEndpoint, {
        method: 'POST',
        headers: this.headersNoScope,
        body: JSON.stringify(payload),
      });
      log(
        LogLevel.Info,
        LogArea.TwitchAPI,
        `registerStreamOfflineWSSubscription - Response = ${response.status}`,
      );
    } catch (err) {
      log(
        LogLevel.Error,
        LogArea.TwitchAPI,
        `registerStreamOfflineWSSubscription ${err}`,
      );
    }
  }

  /**
   * Retrieves data regarding a Twitch user from the Twitch API
   * @param id id or username of the user to retrieve
   */
  public async getUser(id: number | string): Promise<User | undefined> {
    const url = `${this.twitchAPIUserEndpoint}?${Number.isInteger(id) ? 'id=' : 'login='
      }${id}`;

    let user: User | undefined = undefined;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });
      const body = await response.json();
      if (body) {
        const userData = body.data.length > 1 ? body.data : body.data[0];
        if (userData) {
          user = {
            login: userData.login,
            avatar_url: userData.profile_image_url,
            id: userData.id,
            display_name: userData.display_name,
            lastUpdated: new Date(),
          };
        }
      }
    } catch (err) {
      log(LogLevel.Error, LogArea.TwitchAPI, `getUser ${err}`);
    }
    return user;
  }

  public async getStream(streamDate: string): Promise<Stream | undefined> {
    const url = `${this.twitchAPIStreamEndpoint}?user_id=${this._config.TWITCH_CHANNEL_ID}&first=1`;

    let stream: Stream | undefined;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });
      const body = await response.json();
      if (body) {
        const streamData = body.data.length > 1 ? body.data : body.data[0];
        if (streamData) {
          stream = {
            started_at: streamData.started_at,
            streamDate,
            title: streamData.title,
          } as Stream;
        }
      }
    } catch (err) {
      log(LogLevel.Error, LogArea.TwitchAPI, `getStream ${err}`);
    }

    return stream;
  }

  public async createScheduledStream(gathering: GatheringEvent): Promise<string | undefined> {
    const url = `${this.twitchAPIScheduleEndpoint}?broadcaster_id=${this._config.TWITCH_CHANNEL_ID}`;

    let scheduledSegmentId: string | undefined = undefined;

    const body = {
      start_time: gathering.releaseDateStart,
      timezone: 'America/Chicago',
      title: gathering.name,
      category_id: '509670',
      is_recurring: false,
      duration: 180,
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body)
      });
      const { data } = await response.json();
      if (data) {
        if (data.segments && data.segments.length > 0) {
          scheduledSegmentId = data.segments[0].id;

          log(
            LogLevel.Info,
            LogArea.TwitchAPI,
            `Created Twitch segment ${gathering.name} (${scheduledSegmentId})`,
          );

          // Publish new Twitch Event Id to Pipedream/Notion
          await fetch(
            this._config.PIPEDREAM_UPDATE_TWITCH_EVENT_ID_WEBHOOK as string,
            {
              method: 'POST',
              body: JSON.stringify({
                notionPageId: gathering.id,
                twitchEventId: scheduledSegmentId,
              }),
            },
          );
        }
      }
    } catch (err) {
      log(LogLevel.Error, LogArea.TwitchAPI, `createScheduledStream ${err}`);
    }
    return scheduledSegmentId;
  }

  public async updateScheduledStream(gathering: GatheringEvent): Promise<string | undefined> {
    const url = `${this.twitchAPIScheduleEndpoint}?broadcaster_id=${this._config.TWITCH_CHANNEL_ID}&id=${gathering.twitchEventId}`;

    let scheduledSegmentId: string | undefined = undefined;

    const body = {
      start_time: gathering.releaseDateStart,
      timezone: 'America/Chicago',
      title: gathering.name,
      category_id: '509670',
      is_recurring: false,
      duration: 180,
      is_canceled: gathering.status.toLocaleLowerCase() === 'canceled'
    }

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(body)
      });
      const { data } = await response.json();
      if (data) {
        if (data.segments && data.segments.length > 0) {
          scheduledSegmentId = data.segments[0].id;
        }
      }
    } catch (err) {
      log(LogLevel.Error, LogArea.TwitchAPI, `updateScheduledStream ${err}`);
    }
    return scheduledSegmentId;
  }
}
