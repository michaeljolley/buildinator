import {OnCommandEvent} from '../../types/events/onCommandEvent';
import {OnSayEvent} from '../../types/events/onSayEvent';
import {Events} from '../../constants';
import {ShouldThrottle} from '../shouldThrottle';
import {EventBus} from '../../events';
/**
 * Sends a message to chat with a link to Michael's GitHub profile
 * @param onCommandEvent
 */
export function gitHub(onCommandEvent: OnCommandEvent): void {
  const cooldownSeconds = 300;

  // The broadcaster is allowed to bypass throttling. Otherwise,
  // only proceed if the command hasn't been used within the cooldown.
  if (
    !onCommandEvent.flags.broadcaster &&
    ShouldThrottle(onCommandEvent.extra.sinceLastCommand, cooldownSeconds, true)
  ) {
    return;
  }

  const message = `All of our code can be found at https://github.com/builders-club`;

  // Send the message to Twitch chat
  EventBus.eventEmitter.emit(Events.OnSay, new OnSayEvent(message));
}
