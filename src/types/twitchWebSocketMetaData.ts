export type TwitchWebSocketMetaData = {
  message_id: string;
  message_type:
    | 'session_welcome'
    | 'session_keepalive'
    | 'notification'
    | 'session_reconnect'
    | 'revocation';
  message_timestamp: string;
  subscription_type?: 'channel.follow' | 'stream.online' | 'stream.offline';
  subscription_version?: string;
};
