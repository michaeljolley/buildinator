import { Server as IOServer, Socket } from 'socket.io';
import { WebSocket, MessageEvent } from 'ws';
import { Server as HttpServer } from 'http';

import { EventBus } from '../events';
import { Events } from '../constants';
import { log, LogLevel, LogArea } from '../log';
import { BuildinatorConfig } from '../types/buildinatorConfig';
import { OnChatMessageEvent } from '../types/events/onChatMessageEvent';
import { OnCommandEvent } from '../types/events/onCommandEvent';
import { OnSoundEffectEvent } from '../types/events/onSoundEffectEvent';
import { OnCheerEvent } from '../types/events/onCheerEvent';
import { OnFollowEvent } from '../types/events/onFollowEvent';
import { OnJoinEvent } from '../types/events/onJoinEvent';
import { OnPartEvent } from '../types/events/onPartEvent';
import { OnPointRedemptionEvent } from '../types/events/onPointRedemptionEvent';
import { OnStopEvent } from '../types/events/onStopEvent';
import { OnSubEvent } from '../types/events/onSubEvent';
import { OnRaidEvent } from '../types/events/onRaidEvent';
import { OnCreditRollEvent } from '../types/events/onCreditRollEvent';
import { TwitchWebSocketPayloadSession } from '../types/twitchWebSocketPayloadSession';
import { TwitchWebSocketMessage } from '../types/twitchWebSocketMessage';
import { TwitchFollowEvent } from '../types/twitchFollowEvent';
import TwitchAPI from '../twitchAPI';
import { User } from '../types/user';
import { UserEvent } from '../types/userEvent';
import { OnStreamEvent } from '../types/events/onStreamEvent';

export class WebSockets {
  private io: IOServer;
  private client: WebSocket;

  constructor(server: HttpServer, config: BuildinatorConfig) {
    this.io = new IOServer(server);

    this.io.on('connect', (conn: Socket) => {
      // Ensure the connection is from the bots www and not
      // and external actor.
      if (conn.handshake.headers.host !== config.WWW_HOST) {
        log(
          LogLevel.Error,
          LogArea.SocketIOHub,
          `WS disconnected as not an approved host ${conn.handshake.headers.host} : ${config.WWW_HOST}`,
        );
        conn.disconnect(true);
      }
    });

    this.client = new WebSocket('wss://eventsub-beta.wss.twitch.tv/ws');

    this.client.onclose = () => {
      log(
        LogLevel.Info,
        LogArea.SocketIOHub,
        `Twitch WS: Reconnecting to Twitch`,
      );
      this.client = new WebSocket('wss://eventsub-beta.wss.twitch.tv/ws');
    };

    this.client.onerror = err => {
      log(LogLevel.Error, LogArea.SocketIOHub, `Twitch WS: ${err}`);
    };

    this.client.onmessage = async (event: MessageEvent) =>
      await this.clientMessage(JSON.parse(event.data as string));

    EventBus.eventEmitter.addListener(
      Events.OnChatMessage,
      (onChatMessageEvent: OnChatMessageEvent) =>
        this.onChat(onChatMessageEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnCommand,
      (onCommandEvent: OnCommandEvent) => this.onCommand(onCommandEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnSoundEffect,
      (onSoundEffectEvent: OnSoundEffectEvent) =>
        this.onSoundEffect(onSoundEffectEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnCheer,
      (onCheerEvent: OnCheerEvent) => this.onCheer(onCheerEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnFollow,
      (onFollowEvent: OnFollowEvent) => this.onFollow(onFollowEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnJoin,
      (onJoinEvent: OnJoinEvent) => this.onJoin(onJoinEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnPart,
      (onPartEvent: OnPartEvent) => this.onPart(onPartEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnPointRedemption,
      (onPointRedemptionEvent: OnPointRedemptionEvent) =>
        this.onPointRedemption(onPointRedemptionEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnStop,
      (onStopEvent: OnStopEvent) => this.onStop(onStopEvent),
    );
    EventBus.eventEmitter.addListener(Events.OnSub, (onSubEvent: OnSubEvent) =>
      this.onSub(onSubEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnRaid,
      (onRaidEvent: OnRaidEvent) => this.onRaid(onRaidEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnCreditRoll,
      (onCreditRollEvent: OnCreditRollEvent) =>
        this.onCreditRoll(onCreditRollEvent),
    );
  }

  private async clientMessage(message: TwitchWebSocketMessage) {
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

  private async clientRegisterSubscriptions(
    session: TwitchWebSocketPayloadSession,
  ) {
    await TwitchAPI.registerWebSocketSubscriptions(session.id);
  }

  private async clientHandleNotification(message: TwitchWebSocketMessage) {
    switch (message.metadata.subscription_type) {
      case 'channel.follow':
        await this.clientHandleOnFollow(
          message.payload.event as TwitchFollowEvent,
        );
        break;
      // case "stream.offline":
      //     await this.clientHandleStreamOffline(message.payload.event as TwitchStreamEvent);
      //     break;
      // case "stream.online":
      //     await this.clientHandleStreamOnline(message.payload.event as TwitchStreamEvent);
      //     break;
    }
  }

  private async clientHandleOnFollow(twitchFollowEvent: TwitchFollowEvent) {
    let userInfo: User | undefined;
    try {
      userInfo = await TwitchAPI.getUser(parseInt(twitchFollowEvent.user_id));
    } catch (err) {
      log(LogLevel.Error, LogArea.SocketIOHub, `/follow - ${err}`);
    }
    if (userInfo) {
      log(
        LogLevel.Info,
        LogArea.SocketIOHub,
        `WS Follow: ${userInfo?.display_name}`,
      );
      this.emit(Events.OnFollow, new OnFollowEvent(userInfo));
    }
  }

  // private async clientHandleStreamOffline(twitchStreamEvent: TwitchStreamEvent) {
  //     let stream: Stream
  //     const streamDate = new Date().toLocaleDateString('en-US')
  //     try {
  //         stream = await TwitchAPI.getStream(streamDate)
  //         stream.ended_at = stream.ended_at || new Date().toISOString()
  //         await Twitch.saveStream(stream)
  //     }
  //     catch (err) {
  //         log(LogLevel.Error, `webhooks: /stream_offline - ${err}`)
  //     }
  //     log(LogLevel.Info, `WS Stream Offline: ${streamDate}`)

  //     this.emit(Events.OnStreamEnd, { stream } as OnStreamEvent);
  // }

  // private async clientHandleStreamOnline(streamOnlineEvent: TwitchStreamEvent) {
  //     let stream: Stream
  //     const streamDate = new Date(streamOnlineEvent.started_at).toLocaleDateString('en-US')
  //     try {
  //         stream = await Twitch.getStream(streamDate)
  //     }
  //     catch (err) {
  //         log(LogLevel.Error, `webhooks: /stream_online - ${err}`)
  //     }
  //     log(LogLevel.Info, `WS Stream Online: ${streamDate}`)
  //     this.emit(Events.OnStreamStart, { stream } as OnStreamEvent);
  // }

  private onChat(onChatMessageEvent: OnChatMessageEvent) {
    this.io.emit(Events.OnChatMessage, onChatMessageEvent);
    //Tigris.saveUserEvent(onChatMessageEvent)
  }

  private onCreditRoll(onCreditRollEvent: OnCreditRollEvent) {
    this.io.emit(Events.OnCreditRoll, onCreditRollEvent);
  }

  private requestCreditRoll(streamDate: string) {
    log(LogLevel.Info, LogArea.SocketIOHub, `requestCreditRoll ${streamDate}`);
    this.emit(Events.RequestCreditRoll, streamDate);
  }

  private onCommand(onCommandEvent: OnCommandEvent) {
    this.io.emit(Events.OnCommand, onCommandEvent);
    //Tigris.saveUserEvent(onCommandEvent)
  }

  private onSoundEffect(onSoundEffectEvent: OnSoundEffectEvent) {
    this.io.emit(Events.OnSoundEffect, onSoundEffectEvent);
  }

  private onCheer(onCheerEvent: OnCheerEvent) {
    this.io.emit(Events.OnCheer, onCheerEvent);
    //Tigris.saveUserEvent(onCheerEvent)
  }

  private onFollow(onFollowEvent: OnFollowEvent) {
    this.io.emit(Events.OnFollow, onFollowEvent);
    // Tigris.saveUserEvent(onFollowEvent)
  }

  private onJoin(onJoinEvent: OnJoinEvent) {
    this.io.emit(Events.OnJoin, onJoinEvent);
  }

  private onPart(onPartEvent: OnPartEvent) {
    this.io.emit(Events.OnPart, onPartEvent);
  }

  private onPointRedemption(onPointRedemptionEvent: OnPointRedemptionEvent) {
    this.io.emit(Events.OnPointRedemption, onPointRedemptionEvent);
    // Tigris.saveUserEvent(onPointRedemptionEvent)
  }

  private onStop(onStopEvent: OnStopEvent) {
    this.io.emit(Events.OnStop, onStopEvent);
  }

  private onSub(onSubEvent: OnSubEvent) {
    this.io.emit(Events.OnSub, onSubEvent);
    // Tigris.saveUserEvent(onSubEvent)
  }

  private onRaid(onRaidEvent: OnRaidEvent) {
    this.io.emit(Events.OnRaid, onRaidEvent);
    // Tigris.saveUserEvent(onRaidEvent)
  }

  private emit(event: Events, payload: UserEvent | OnStreamEvent | string) {
    EventBus.eventEmitter.emit(event, payload);
  }
}
