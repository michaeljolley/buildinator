import { Events } from '../../constants';
import { ShouldThrottle } from '../shouldThrottle';
import { EventBus } from '../../events';
import { OnCommandEvent } from '../../types/events/onCommandEvent';
import { OnSayEvent } from '../../types/events/onSayEvent';
/**
 * Sends a message to chat with details about Michael's Youtube
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

  const message = `For more content, check out the Bald Bearded Builder on YouTube at https://www.youtube.com/baldbeardedbuilder`;

  // Send the message to Twitch chat
  EventBus.eventEmitter.emit(Events.OnSay, new OnSayEvent(message));
}
