import {Server as IOServer, Socket} from 'socket.io';
import {Server as HttpServer} from 'http';

import {EventBus} from '../events';
import {Events} from '../constants';
import {log, LogLevel, LogArea} from '../log';
import {BuildinatorConfig} from '../types/buildinatorConfig';
import {OnChatMessageEvent} from '../types/events/onChatMessageEvent';
import {OnCommandEvent} from '../types/events/onCommandEvent';
import {OnSoundEffectEvent} from '../types/events/onSoundEffectEvent';
import {OnCheerEvent} from '../types/events/onCheerEvent';
import {OnFollowEvent} from '../types/events/onFollowEvent';
import {OnJoinEvent} from '../types/events/onJoinEvent';
import {OnPartEvent} from '../types/events/onPartEvent';
import {OnPointRedemptionEvent} from '../types/events/onPointRedemptionEvent';
import {OnStopEvent} from '../types/events/onStopEvent';
import {OnSubEvent} from '../types/events/onSubEvent';
import {OnRaidEvent} from '../types/events/onRaidEvent';
import {OnCreditRollEvent} from '../types/events/onCreditRollEvent';
import {UserEvent} from '../types/userEvent';
import {OnStreamEvent} from '../types/events/onStreamEvent';
import { OnMuteEvent } from '../types/events/onMuteEvent';
import { OnUnmuteEvent } from '../types/events/onUnmuteEvent';
import { OnClearEvent } from '../types/events/onClearEvent';

export class WebSockets {
  private io: IOServer;

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
    EventBus.eventEmitter.addListener(
      Events.OnClear,
      (onClearEvent: OnClearEvent) => this.onStop(onClearEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnMute,
      (onMuteEvent: OnMuteEvent) => this.onMute(onMuteEvent),
    );
    EventBus.eventEmitter.addListener(
      Events.OnUnmute,
      (onUnmuteEvent: OnUnmuteEvent) => this.onUnmute(onUnmuteEvent),
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

  private onChat(onChatMessageEvent: OnChatMessageEvent) {
    this.io.emit(Events.OnChatMessage, onChatMessageEvent);
  }

  private onCreditRoll(onCreditRollEvent: OnCreditRollEvent) {
    this.io.emit(Events.OnCreditRoll, onCreditRollEvent);
  }

  private requestCreditRoll(streamDate: string) {
    this.emit(Events.RequestCreditRoll, streamDate);
  }

  private onCommand(onCommandEvent: OnCommandEvent) {
    this.io.emit(Events.OnCommand, onCommandEvent);
  }

  private onSoundEffect(onSoundEffectEvent: OnSoundEffectEvent) {
    this.io.emit(Events.OnSoundEffect, onSoundEffectEvent);
  }

  private onCheer(onCheerEvent: OnCheerEvent) {
    this.io.emit(Events.OnCheer, onCheerEvent);
  }

  private onFollow(onFollowEvent: OnFollowEvent) {
    this.io.emit(Events.OnFollow, onFollowEvent);
  }

  private onJoin(onJoinEvent: OnJoinEvent) {
    this.io.emit(Events.OnJoin, onJoinEvent);
  }

  private onPart(onPartEvent: OnPartEvent) {
    this.io.emit(Events.OnPart, onPartEvent);
  }

  private onPointRedemption(onPointRedemptionEvent: OnPointRedemptionEvent) {
    this.io.emit(Events.OnPointRedemption, onPointRedemptionEvent);
  }

  private onStop(onStopEvent: OnStopEvent) {
    this.io.emit(Events.OnStop, onStopEvent);
  }
  
  private onClear(onClearEvent: OnClearEvent) {
    this.io.emit(Events.OnClear, onClearEvent);
  }
  
  private onMute(onMuteEvent: OnMuteEvent) {
    this.io.emit(Events.OnMute, onMuteEvent);
  }
  
  private onUnmute(onUnmuteEvent: OnUnmuteEvent) {
    this.io.emit(Events.OnUnmute, onUnmuteEvent);
  }

  private onSub(onSubEvent: OnSubEvent) {
    this.io.emit(Events.OnSub, onSubEvent);
  }

  private onRaid(onRaidEvent: OnRaidEvent) {
    this.io.emit(Events.OnRaid, onRaidEvent);
  }

  private emit(event: Events, payload: UserEvent | OnStreamEvent | string) {
    EventBus.eventEmitter.emit(event, payload);
  }
}
