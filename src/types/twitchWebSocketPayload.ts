import {TwitchFollowEvent} from './twitchFollowEvent';
import {TwitchStreamEvent} from './twitchStreamEvent';
import {TwitchWebSocketPayloadSession} from './twitchWebSocketPayloadSession';
import {TwitchWebSocketPayloadSubscription} from './twitchWebSocketPayloadSubscription';

export type TwitchWebSocketPayload = {
  session?: TwitchWebSocketPayloadSession;
  subscription?: TwitchWebSocketPayloadSubscription;
  event?: TwitchFollowEvent | TwitchStreamEvent;
};
