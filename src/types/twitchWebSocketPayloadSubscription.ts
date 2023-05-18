export type TwitchWebSocketPayloadSubscription = {
  id: string;
  status: string;
  type: string;
  version: string;
  cost: string;
  condition: {
    broadcaster_user_id: string;
  };
  transport: {
    method: string;
    session_id: string;
  };
  created_at: string;
};
