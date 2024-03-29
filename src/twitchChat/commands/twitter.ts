import { OnCommandEvent } from '../../types/events/onCommandEvent';
import { OnSayEvent } from '../../types/events/onSayEvent';
import { Events } from '../../constants';
import { ShouldThrottle } from '../shouldThrottle';
import { EventBus } from '../../events';
/**
 * Sends a message to chat with details about Michael's Twitter
 * @param onCommandEvent
 */
export default function (onCommandEvent: OnCommandEvent): void {
  const cooldownSeconds = 300;

  // The broadcaster is allowed to bypass throttling. Otherwise,
  // only proceed if the command hasn't been used within the cooldown.
  if (
    !onCommandEvent.flags.broadcaster &&
    ShouldThrottle(onCommandEvent.extra.sinceLastCommand, cooldownSeconds, true)
  ) {
    return;
  }

  const message = `Follow Michael on Twitter at https://twitter.com/michaeljolley`;

  // Send the message to Twitch chat
  EventBus.eventEmitter.emit(Events.OnSay, new OnSayEvent(message));
}
