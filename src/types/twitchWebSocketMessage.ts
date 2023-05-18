import {TwitchWebSocketMetaData} from './twitchWebSocketMetaData';
import {TwitchWebSocketPayload} from './twitchWebSocketPayload';

export type TwitchWebSocketMessage = {
  metadata: TwitchWebSocketMetaData;
  payload: TwitchWebSocketPayload;
};
