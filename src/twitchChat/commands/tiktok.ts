import {OnCommandEvent} from '../../types/events/onCommandEvent';
import {OnSayEvent} from '../../types/events/onSayEvent';
import {Events} from '../../constants';
import {ShouldThrottle} from '../shouldThrottle';
import {EventBus} from '../../events';

/**
 * Sends a message to chat with info on BBB TikTok
 * @param onCommandEvent
 */
export function tiktok(onCommandEvent: OnCommandEvent): void {
  const cooldownSeconds = 300;

  // The broadcaster is allowed to bypass throttling. Otherwise,
  // only proceed if the command hasn't been used within the cooldown.
  if (
    !onCommandEvent.flags.broadcaster &&
    ShouldThrottle(onCommandEvent.extra.sinceLastCommand, cooldownSeconds, true)
  ) {
    return;
  }

  const message = `Follow BBB on TikTok at https://www.tiktok.com/@baldbeardedbuilder`;

  // Send the message to Twitch chat
  EventBus.eventEmitter.emit(Events.OnSay, new OnSayEvent(message));
}