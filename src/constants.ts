/**
 * Events emitted from EventBus.
 */
export enum Events {
  GatheringScheduled = 'gathering:scheduled',
  GatheringStart = 'gathering:start',
  GatheringEnd = 'gathering:end',
  ShareableCreated = 'shareable:created',
  PullRequestMerged = 'contributions:pullrequest:merged',
  OnChatMessage = 'twitch:chat_message',
  OnCheer = 'twitch:cheer',
  OnCommand = 'twitch:command',
  OnCreditRoll = 'twitch:credit_roll',
  OnFollow = 'twitch:follow',
  OnJoin = 'twitch:join',
  OnPart = 'twitch:part',
  OnPointRedemption = 'twitch:point_redemption',
  OnSoundEffect = 'twitch:sound_effect',
  OnStop = 'twitch:stop',
  OnStreamChange = 'twitch:stream_change',
  OnStreamEnd = 'twitch:stream_end',
  OnStreamStart = 'twich:stream_start',
  OnSub = 'twitch:sub',
  OnRaid = 'twich:raid',
  OnSay = 'twitch:say',
  RequestCreditRoll = 'twich:request_credit_roll',
}

export enum OrbitActivities {
  BrewWithMe = 'event:discord:brew_with_me',
}

export enum UserEventType {
  ChatMessage = 'chatMessage',
  Cheer = 'cheer',
  Command = 'command',
  Follow = 'follow',
  PointRedemption = 'pointRedemption',
  SoundEffect = 'soundEffect',
  Sub = 'sub',
  Raid = 'raid',
  Join = 'join',
  Part = 'part',
}
