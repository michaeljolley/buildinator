import ComfyJS, {
  OnCommandExtra,
  OnMessageFlags,
  OnMessageExtra,
  EmoteSet,
  OnSubGiftExtra,
  OnResubExtra,
  OnSubExtra,
  OnCheerFlags,
  OnCheerExtra,
} from 'comfy.js';
import sanitizeHtml from 'sanitize-html';
import {SubMethods} from 'tmi.js';

import {BuildinatorConfig} from '../types/buildinatorConfig';
import {CommandMonitor} from './commandMonitor';
import {EventBus} from '../events';
import {Events} from '../constants';
import {OnSayEvent} from '../types/events/onSayEvent';
import {LogArea, LogLevel, log} from '../log';
import {OnSubEvent} from '../types/events/onSubEvent';
import {User} from '../types/user';
import {OnCommandEvent} from '../types/events/onCommandEvent';
import {OnChatMessageEvent} from '../types/events/onChatMessageEvent';
import {OnJoinEvent} from '../types/events/onJoinEvent';
import {OnPartEvent} from '../types/events/onPartEvent';
import {OnCheerEvent} from '../types/events/onCheerEvent';
import {OnRaidEvent} from '../types/events/onRaidEvent';
import {Emote} from '../types/emote';
import TwitchAPI from '../twitchAPI';

export default abstract class TwitchChat {
  private static _config: BuildinatorConfig;
  private static _commandMonitor: CommandMonitor;

  static async init(config: BuildinatorConfig): Promise<void> {
    this._config = config;

    this._commandMonitor = new CommandMonitor();

    ComfyJS.onChat = this.onChat.bind(this);
    ComfyJS.onCommand = this.onCommand.bind(this);
    ComfyJS.onCheer = this.onCheer.bind(this);
    ComfyJS.onRaid = this.onRaid.bind(this);
    ComfyJS.onResub = this.onResub.bind(this);
    ComfyJS.onSub = this.onSub.bind(this);
    ComfyJS.onSubGift = this.onSubGift.bind(this);
    ComfyJS.onSubMysteryGift = this.onSubMysteryGift.bind(this);
    ComfyJS.onJoin = this.onJoin.bind(this);
    ComfyJS.onPart = this.onPart.bind(this);

    ComfyJS.Init(
      this._config.TWITCH_BOT_USERNAME,
      this._config.TWITCH_BOT_AUTH_TOKEN,
      this._config.TWITCH_CHANNEL_NAME
    );

    EventBus.eventEmitter.addListener(Events.OnSay, (onSayEvent: OnSayEvent) =>
      this.onSay(onSayEvent),
    );
  }

  private static onSay(onSayEvent: OnSayEvent) {
    ComfyJS.Say(onSayEvent.message, this._config.TWITCH_CHANNEL_NAME);
  }

  private static async onCommand(
    user: string,
    command: string,
    message: string,
    flags: OnMessageFlags,
    extra: OnCommandExtra,
  ) {
    log(
      LogLevel.Info,
      LogArea.Twitch,
      `onCommand: ${user} sent the ${command} command`,
    );
    let userInfo: User | undefined;

    try {
      userInfo = await TwitchAPI.getUser(parseInt(extra.userId));
    } catch (err) {
      log(LogLevel.Error, LogArea.Twitch, `onCommand: getUser: ${err}`);
    }

    if (userInfo) {
      this.emit(
        Events.OnCommand,
        new OnCommandEvent(userInfo, command, message, flags, extra),
      );
    }
  }

  private static async onChat(
    user: string,
    message: string,
    flags: OnMessageFlags,
    self: boolean,
    extra: OnMessageExtra,
  ) {
    log(LogLevel.Info, LogArea.Twitch, `onChat: ${user}: ${message}`);

    user = user.toLocaleLowerCase();

    if (
      !self &&
      user !== this._config.TWITCH_BOT_USERNAME.toLocaleLowerCase() &&
      user !== this._config.TWITCH_CHANNEL_NAME.toLocaleLowerCase()
    ) {
      let userInfo: User | undefined;

      try {
        userInfo = await TwitchAPI.getUser(parseInt(extra.userId));
      } catch (err) {
        log(LogLevel.Error, LogArea.Twitch, `onChat: ${err}`);
      }

      if (userInfo) {
        const processedChat = this.processChat(
          message,
          flags,
          extra.messageEmotes,
        );
        if (processedChat.message.length > 0) {
          this.emit(
            Events.OnChatMessage,
            new OnChatMessageEvent(
              userInfo,
              message,
              processedChat.message,
              flags,
              self,
              extra,
              extra.id,
              processedChat.emotes,
            ),
          );
        }
      }
    }
  }

  private static processChat(
    message: string,
    flags: OnMessageFlags,
    messageEmotes?: EmoteSet,
  ) {
    let tempMessage: string = message.replace(/<img/gi, '<DEL');

    const emotes: string[] = [];
    const theme = flags.vip || flags.mod ? 'light' : 'dark';

    // If the message has emotes, modify message to include img tags to the emote
    if (messageEmotes) {
      const emoteSet: Array<Emote> = [];

      for (const emote of Object.keys(messageEmotes)) {
        const emoteLocations = messageEmotes[emote];
        emoteLocations.forEach(location => {
          emoteSet.push(this.generateEmote(emote, location, theme));
        });
      }

      // Order the emotes descending so we can iterate
      // through them with indexes
      emoteSet.sort((a, b) => {
        return b.end - a.end;
      });

      emoteSet.forEach(emote => {
        emotes.push(emote.emoteImageTag);

        let emoteMessage = tempMessage.slice(0, emote.start);
        emoteMessage += emote.emoteImageTag;
        emoteMessage += tempMessage.slice(emote.end + 1, tempMessage.length);
        tempMessage = emoteMessage;
      });
    }

    tempMessage = sanitizeHtml(tempMessage, {
      allowedAttributes: {
        img: ['class', 'src'],
      },
      allowedTags: [
        'marquee',
        'em',
        'strong',
        'b',
        'i',
        'code',
        'strike',
        'blink',
        'img',
        'h1',
        'h2',
        'h3',
      ],
    });

    tempMessage = tempMessage.replace(/@(\w*)/gm, `<span>$&</span>`);

    return {
      message: tempMessage,
      emotes,
    };
  }

  private static generateEmote(
    emoteId: string,
    position: string,
    theme: string,
  ): Emote {
    const [start, end] = position.split('-').map(Number);

    return {
      emoteId,
      emoteImageTag: `<img class='emote' src='https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/${theme}/1.0'/>`,
      emoteUrl: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/${theme}/1.0`,
      start,
      end,
    };
  }

  private static async onJoin(user: string, self: boolean) {
    log(LogLevel.Info, LogArea.Twitch, `onJoin: ${user}`);
    let userInfo: User | undefined;

    try {
      userInfo = await TwitchAPI.getUser(user);
    } catch (err) {
      log(LogLevel.Error, LogArea.Twitch, `onJoin: ${err}`);
    }

    if (userInfo) {
      this.emit(Events.OnJoin, new OnJoinEvent(userInfo, self));
    }
  }

  private static async onPart(user: string, self: boolean) {
    log(LogLevel.Info, LogArea.Twitch, `onPart: ${user}`);
    let userInfo: User | undefined;

    try {
      userInfo = await TwitchAPI.getUser(user);
    } catch (err) {
      log(LogLevel.Error, LogArea.Twitch, `onPart: ${err}`);
    }

    if (userInfo) {
      this.emit(Events.OnPart, new OnPartEvent(userInfo, self));
    }
  }

  private static async onCheer(
    user: string,
    message: string,
    bits: number,
    flags: OnCheerFlags,
    extra: OnCheerExtra,
  ) {
    log(LogLevel.Info, LogArea.Twitch, `onCheer: ${user} cheered ${bits} bits`);
    let userInfo: User | undefined;

    try {
      userInfo = await TwitchAPI.getUser(parseInt(extra.userId));
    } catch (err) {
      log(LogLevel.Error, LogArea.Twitch, `onCheer: ${err}`);
    }

    if (userInfo) {
      this.emit(
        Events.OnCheer,
        new OnCheerEvent(userInfo, message, bits, flags, extra),
      );
    }
  }

  private static async onRaid(user: string, viewers: number) {
    log(
      LogLevel.Info,
      LogArea.Twitch,
      `onRaid: ${user} raided with ${viewers} viewers`,
    );
    let userInfo: User | undefined;

    try {
      userInfo = await TwitchAPI.getUser(user);
    } catch (err) {
      log(LogLevel.Error, LogArea.Twitch, `onRaid: ${err}`);
    }

    if (userInfo) {
      this.emit(Events.OnRaid, new OnRaidEvent(userInfo, viewers));
    }
  }

  private static async onSub(
    user: string,
    message: string,
    subTierInfo: SubMethods,
    extra: OnSubExtra,
  ) {
    log(LogLevel.Info, LogArea.Twitch, `onSub: ${user} subbed`);
    let userInfo: User | undefined;

    try {
      userInfo = await TwitchAPI.getUser(parseInt(extra.userId));
    } catch (err) {
      log(LogLevel.Error, LogArea.Twitch, `onSub: ${err}`);
    }

    if (userInfo) {
      this.emit(
        Events.OnSub,
        new OnSubEvent(userInfo, message, subTierInfo, extra),
      );
    }
  }

  private static async onSubGift(
    gifterUser: string,
    streakMonths: number,
    recipientUser: string,
    senderCount: number,
    subTierInfo: SubMethods,
    extra: OnSubGiftExtra,
  ) {
    log(
      LogLevel.Info,
      LogArea.Twitch,
      `onSubGift: ${gifterUser} gifted a sub to ${recipientUser}`,
    );
    let userInfo: User | undefined;
    let gifterInfo: User | undefined;

    try {
      userInfo = await TwitchAPI.getUser(parseInt(extra.recipientId));
    } catch (err) {
      log(LogLevel.Error, LogArea.Twitch, `onSubGift: ${err}`);
    }

    try {
      gifterInfo = await TwitchAPI.getUser(parseInt(extra.userId));
    } catch (err) {
      log(LogLevel.Error, LogArea.Twitch, `onSubGift: ${err}`);
    }

    if (userInfo) {
      this.emit(
        Events.OnSub,
        new OnSubEvent(userInfo, '', subTierInfo, extra, undefined, gifterInfo),
      );
    }
  }

  private static async onResub(
    user: string,
    message: string,
    streakMonths: number,
    cumulativeMonths: number,
    subTierInfo: SubMethods,
    extra: OnResubExtra,
  ) {
    log(
      LogLevel.Info,
      LogArea.Twitch,
      `onResub: ${user} resubbed for ${cumulativeMonths} total months`,
    );
    let userInfo: User | undefined;

    try {
      userInfo = await TwitchAPI.getUser(parseInt(extra.userId));
    } catch (err) {
      log(LogLevel.Error, LogArea.Twitch, `onResub: ${err}`);
    }

    if (userInfo) {
      this.emit(
        Events.OnSub,
        new OnSubEvent(userInfo, message, subTierInfo, extra, cumulativeMonths),
      );
    }
  }

  private static async onSubMysteryGift(
    gifterUser: string,
    numbOfSubs: number,
  ) {
    log(
      LogLevel.Info,
      LogArea.Twitch,
      `onSubMysteryGift: ${gifterUser} gifted ${numbOfSubs}`,
    );
  }

  private static emit(event: Events, payload: unknown) {
    EventBus.eventEmitter.emit(event, payload);
  }
}
