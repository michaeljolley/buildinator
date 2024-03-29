/**
 * Events emitted from EventBus.
 */
export enum Events {
  GatheringScheduled = 'gathering:scheduled',
  GatheringStart = 'gathering:start',
  GatheringEnd = 'gathering:end',
  DiscordSay = 'discord:say',
  ShareableCreated = 'shareable:created',
  PullRequestMerged = 'contributions:pullrequest:merged',
  OnChatMessage = 'twitch:chat_message',
  OnCheer = 'twitch:cheer',
  OnCommand = 'twitch:command',
  OnCreditRoll = 'twitch:credit_roll',
  OnFollow = 'twitch:follow',
  OnJoin = 'twitch:join',
  OnPart = 'twitch:part',
  OnMute = 'twitch:mute',
  OnClear = 'twitch:clear',
  OnUnmute = 'twitch:unmute',
  OnPointRedemption = 'twitch:point_redemption',
  OnSoundEffect = 'twitch:sound_effect',
  OnStop = 'twitch:stop',
  OnStreamChange = 'twitch:stream_change',
  OnStreamEnd = 'twitch:stream_end',
  OnStreamStart = 'twich:stream_start',
  OnSub = 'twitch:sub',
  OnTopic = 'twitch:topic',
  OnRaid = 'twich:raid',
  OnSay = 'twitch:say',
  OnDonation = 'twitch:donation',
  RequestCreditRoll = 'twich:request_credit_roll',
}

export enum OrbitActivities {
  BrewWithMe = 'event:discord:brew_with_me',
}

export enum UserEventType {
  ChatMessage = 'chat_message',
  Cheer = 'cheer',
  Command = 'command',
  Follow = 'follow',
  PointRedemption = 'point_redemption',
  SoundEffect = 'sound_effect',
  Sub = 'sub',
  Raid = 'raid',
  Join = 'join',
  Part = 'part',
}

export const NOTION_EVENT_TYPE_TWITCH = 'Livestream';
export const NOTION_EVENT_TYPE_BREW_WITH_ME = 'Brew With Me';