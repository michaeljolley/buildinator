import {Events, UserEventType} from '../constants';
import {EventBus} from '../events';
import {Orbit} from '../orbit';
import TwitchAPI from '../twitchAPI';
import {BuildinatorConfig} from '../types/buildinatorConfig';
import {OnCheerEvent} from '../types/events/onCheerEvent';
import {OnFollowEvent} from '../types/events/onFollowEvent';
import {OnJoinEvent} from '../types/events/onJoinEvent';
import {OnRaidEvent} from '../types/events/onRaidEvent';
import {OnSubEvent} from '../types/events/onSubEvent';
import {OrbitIdentity} from '../types/orbitIdentity';
import {OrbitActivity} from '../types/orbityActivity';
import {UserEvent} from '../types/userEvent';

export abstract class Logger {
  private static _config: BuildinatorConfig;

  static init(config: BuildinatorConfig) {
    this._config = config;

    EventBus.eventEmitter.on(Events.OnJoin, this.onJoin.bind(this));
    // EventBus.eventEmitter.on(Events.OnChatMessage, this.onChat.bind(this));
    EventBus.eventEmitter.on(Events.OnCheer, this.onCheer.bind(this));
    EventBus.eventEmitter.on(Events.OnRaid, this.onRaid.bind(this));
    // EventBus.eventEmitter.on(Events.OnDonation, this.onDonation.bind(this));
    EventBus.eventEmitter.on(Events.OnFollow, this.onFollow.bind(this));
    EventBus.eventEmitter.on(Events.OnRaid, this.onRaid.bind(this));
    EventBus.eventEmitter.on(Events.OnSub, this.onSub.bind(this));
  }

  private static createTwitchIdentity(userEvent: UserEvent): OrbitIdentity {
    return {
      uid: userEvent.user.id,
      source: 'twitch',
      username: userEvent.user.login,
      name: userEvent.user.display_name,
    };
  }

  private static createTwitchActivity(
    title: string,
    description: string,
    eventType: UserEventType,
  ): OrbitActivity {
    return {
      title,
      description,
      activity_type: 'buildinator',
      activity_type_key: `twitch:${eventType}`,
      link: 'https://twitch.tv/baldbeardedbuilder',
    };
  }

  private static async onJoin(event: OnJoinEvent) {
    const stream = await this.streamCheck();
    if (stream) {
      await Orbit.addActivity(
        this.createTwitchActivity(
          'Joined stream',
          'Joined the Twitch stream',
          event.type,
        ),
        this.createTwitchIdentity(event),
      );
    }
  }

  // private static async onChat(event: OnChatMessageEvent) {

  // }

  private static async onCheer(event: OnCheerEvent) {
    await Orbit.addActivity(
      this.createTwitchActivity(
        `Cheered on Twitch`,
        `Cheered ${event.bits} bits on Twitch`,
        event.type,
      ),
      this.createTwitchIdentity(event),
    );
  }

  private static async onSub(event: OnSubEvent) {
    await Orbit.addActivity(
      this.createTwitchActivity(
        `Subscribed on Twitch`,
        `Subscribed at ${event.subTierInfo} level on Twitch`,
        event.type,
      ),
      this.createTwitchIdentity(event),
    );
  }

  private static async onRaid(event: OnRaidEvent) {
    await Orbit.addActivity(
      this.createTwitchActivity(
        `Raided on Twitch`,
        `Raided with ${event.viewers} on Twitch`,
        event.type,
      ),
      this.createTwitchIdentity(event),
    );
  }

  private static async onFollow(event: OnFollowEvent) {
    await Orbit.addActivity(
      this.createTwitchActivity(
        `Followed on Twitch`,
        `Followed on Twitch`,
        event.type,
      ),
      this.createTwitchIdentity(event),
    );
  }

  // private static async onDonation(event: OnDonationEvent) {

  // }

  private static async streamCheck() {
    const streamDate = new Date().toLocaleDateString('en-US');
    return await TwitchAPI.getStream(streamDate);
  }
}
