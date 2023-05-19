import axios, {AxiosResponse} from 'axios';
import {BuildinatorConfig} from '../types/buildinatorConfig';
import {LogArea, LogLevel, log} from '../log';
import {User} from '../types/user';
import {Stream} from '../types/stream';

export default class API {
  private twitchAPIEndpoint = 'https://api.twitch.tv/helix';
  private twitchAPIUserEndpoint = `${this.twitchAPIEndpoint}/users`;
  private twitchAPIStreamEndpoint = `${this.twitchAPIEndpoint}/streams`;
  private twitchAPIWebhookEndpoint = `${this.twitchAPIEndpoint}/eventsub/subscriptions`;

  private headers: Record<string, string | number | boolean>;
  private wsHeaders: Record<string, string | number | boolean>;
  private headersNoScope: Record<string, string | number | boolean>;
  private _config: BuildinatorConfig;

  constructor(config: BuildinatorConfig) {
    this._config = config;
    this.headers = {
      Authorization: `Bearer ${this._config.TWITCH_CHANNEL_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'Client-ID': this._config.TWITCH_CLIENT_ID,
    };
    this.wsHeaders = {
      Authorization: `Bearer ${this._config.TWITCH_BOT_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'Client-ID': this._config.TWITCH_CLIENT_ID,
    };
    this.headersNoScope = {
      Authorization: `Bearer ${this._config.TWITCH_BOT_AUTH_TOKEN_NO_SCOPE}`,
      'Content-Type': 'application/json',
      'Client-ID': this._config.TWITCH_CLIENT_ID,
    };
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

      const response = await axios.post(
        this.twitchAPIWebhookEndpoint,
        payload,
        {
          headers: this.wsHeaders,
        },
      );
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
        condition: {broadcaster_user_id: `${this._config.TWITCH_CHANNEL_ID}`},
        transport: {method: 'websocket', session_id: sessionId},
      };

      const response = await axios.post(
        this.twitchAPIWebhookEndpoint,
        payload,
        {
          headers: this.headersNoScope,
        },
      );
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
        condition: {broadcaster_user_id: `${this._config.TWITCH_CHANNEL_ID}`},
        transport: {method: 'websocket', session_id: sessionId},
      };

      const response = await axios.post(
        this.twitchAPIWebhookEndpoint,
        payload,
        {
          headers: this.headersNoScope,
        },
      );
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
    const url = `${this.twitchAPIUserEndpoint}?${
      Number.isInteger(id) ? 'id=' : 'login='
    }${id}`;

    let user: User | undefined = undefined;

    try {
      const response: AxiosResponse = await axios.get(url, {
        headers: this.headers,
      });
      if (response.data) {
        const body = response.data;
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
      const response: AxiosResponse = await axios.get(url, {
        headers: this.headers,
      });
      if (response.data) {
        const body = response.data;
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
}
