import { Cache, CacheType } from '../cache';
import { Events, NOTION_EVENT_TYPE_TWITCH } from '../constants';
import { EventBus } from '../events';
import { LogArea, LogLevel, log } from '../log';
import { BuildinatorConfig } from '../types/buildinatorConfig';
import { OnFollowEvent } from '../types/events/onFollowEvent';
import { OnStreamEvent } from '../types/events/onStreamEvent';
import { GatheringEvent } from '../types/gatheringEvent';
import { Stream } from '../types/stream';
import { TwitchFollowEvent } from '../types/twitchFollowEvent';
import { TwitchStreamEvent } from '../types/twitchStreamEvent';
import { TwitchWebSocketMessage } from '../types/twitchWebSocketMessage';
import { TwitchWebSocketPayloadSession } from '../types/twitchWebSocketPayloadSession';
import { User } from '../types/user';
import { UserEvent } from '../types/userEvent';
import API from './api';
import { WebSocket, MessageEvent } from 'ws';

export default abstract class TwitchAPI {
  private static _config: BuildinatorConfig;
  private static client: WebSocket;
  private static api: API;

  static init(config: BuildinatorConfig) {
    this._config = config;

    EventBus.eventEmitter.on(
      Events.GatheringScheduled,
      this.gatheringScheduledHandler.bind(this),
    );

    this.api = new API(this._config);

    this.client = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    this.client.onclose = () => {
      log(
        LogLevel.Info,
        LogArea.TwitchAPI,
        `Twitch WS: Reconnecting to Twitch`,
      );
      this.client = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
    };

    this.client.onerror = err => {
      log(LogLevel.Error, LogArea.TwitchAPI, `Twitch WS: ${err}`);
    };

    this.client.onmessage = async (event: MessageEvent) =>
      await this.clientMessage(JSON.parse(event.data as string));
  }

  private static async clientMessage(message: TwitchWebSocketMessage) {
    switch (message.metadata.message_type) {
      case 'session_welcome':
      case 'session_reconnect':
        if (message.payload.session) {
          await this.clientRegisterSubscriptions(message.payload.session);
        }
        break;

      case 'revocation':
      case 'session_keepalive':
        break;

      case 'notification':
        await this.clientHandleNotification(message);
    }
  }

  private static async clientRegisterSubscriptions(
    session: TwitchWebSocketPayloadSession,
  ) {
    await TwitchAPI.registerWebSocketSubscriptions(session.id);
  }

  private static async clientHandleNotification(
    message: TwitchWebSocketMessage,
  ) {
    switch (message.metadata.subscription_type) {
      case 'channel.follow':
        await this.clientHandleOnFollow(
          message.payload.event as TwitchFollowEvent,
        );
        break;
      case 'stream.offline':
        await this.clientHandleStreamOffline();
        break;
      case 'stream.online':
        await this.clientHandleStreamOnline(
          message.payload.event as TwitchStreamEvent,
        );
        break;
    }
  }

  private static async clientHandleOnFollow(
    twitchFollowEvent: TwitchFollowEvent,
  ) {
    let userInfo: User | undefined;
    try {
      userInfo = await this.api.getUser(parseInt(twitchFollowEvent.user_id));
    } catch (err) {
      log(LogLevel.Error, LogArea.TwitchAPI, `/follow - ${err}`);
    }
    if (userInfo) {
      log(
        LogLevel.Info,
        LogArea.TwitchAPI,
        `WS Follow: ${userInfo?.display_name}`,
      );
      this.emit(Events.OnFollow, new OnFollowEvent(userInfo));
    }
  }

  private static async clientHandleStreamOffline() {
    const streamDate = new Date().toLocaleDateString('en-US');
    const stream = await this.api.getStream(streamDate);
    log(LogLevel.Info, LogArea.TwitchAPI, `WS Stream Offline: ${streamDate}`);
    this.emit(Events.OnStreamEnd, { stream } as OnStreamEvent);
  }

  private static async clientHandleStreamOnline(
    streamOnlineEvent: TwitchStreamEvent,
  ) {
    if (streamOnlineEvent.started_at) {
      let stream: Stream | undefined;
      const streamDate = new Date(
        streamOnlineEvent.started_at,
      ).toLocaleDateString('en-US');
      try {
        stream = await this.api.getStream(streamDate);
      } catch (err) {
        log(
          LogLevel.Error,
          LogArea.TwitchAPI,
          `webhooks: /stream_online - ${err}`,
        );
      }
      log(LogLevel.Info, LogArea.TwitchAPI, `WS Stream Online: ${streamDate}`);
      this.emit(Events.OnStreamStart, { stream } as OnStreamEvent);
    }
  }

  static async registerWebSocketSubscriptions(
    sessionId: string,
  ): Promise<void> {
    await this.api.registerWebSocketSubscriptions(sessionId);
  }

  /**
   * Attempts to retrieve a stream from the cache and, if needed, the Twitch API
   * @param streamDate Date the stream started on
   */
  public static async getStream(
    streamDate: string,
  ): Promise<Stream | undefined> {
    let stream: Stream | undefined = Cache.get(CacheType.Stream, streamDate) as
      | Stream
      | undefined;

    if (!stream) {
      let apiStream: Stream | undefined;
      try {
        apiStream = await this.api.getStream(streamDate);
      } catch (err) {
        log(
          LogLevel.Error,
          LogArea.TwitchAPI,
          `getStream - API:getStream: ${err}`,
        );
      }

      if (apiStream) {
        Cache.set(CacheType.Stream, apiStream);
        stream = apiStream;
      }
    }

    return stream;
  }

  /**
   * Attempts to retrieve a user from the cache and, if needed, the Twitch API
   * @param login Twitch login of user to retrieve
   */
  public static async getUser(id: string | number): Promise<User | undefined> {
    let user: User | undefined;

    if (Number.isInteger(id)) {
      user = Cache.get(CacheType.User, id.toString()) as User | undefined;
    }

    const date = new Date();
    date.setDate(date.getDate() - 1);

    if (!user || !user.lastUpdated || user.lastUpdated < date) {
      let apiUser: User | undefined;
      try {
        apiUser = await this.api.getUser(id);
      } catch (err) {
        log(LogLevel.Error, LogArea.TwitchAPI, `getUser: ${err}`);
      }

      if (apiUser) {
        apiUser.lastUpdated = new Date();
        Cache.set(CacheType.User, apiUser);
        user = apiUser;
      }
    }

    return user;
  }

  /**
   * Creates/updates/deletes Twitch scheduled events based on events
   * saved in Notion.
   * @param gathering A community event from Notion
   */
  static async gatheringScheduledHandler(gathering: GatheringEvent) {
    // If the event type is a stream , then we need
    // to create or update a Twitch scheduled segment.
    try {
      if (
        gathering.type === NOTION_EVENT_TYPE_TWITCH
      ) {
        if (gathering.releaseDateStart) {
          // If the Notion event has a `twitchEventId`, we've already created
          // it in Twitch. In that event, we need to update/delete the event
          // in Twitch.
          !gathering.twitchEventId ||
            gathering.twitchEventId?.length === 0
            ? await this.api.createScheduledStream(gathering)
            : await this.api.updateScheduledStream(gathering);
        }
      }
    }
    catch (error) {
      log(LogLevel.Error, LogArea.TwitchAPI, `gatheringScheduledHandler: ${error}`);
    }
  }

  private static emit(
    event: Events,
    payload: UserEvent | OnStreamEvent | string,
  ) {
    EventBus.eventEmitter.emit(event, payload);
  }
}
