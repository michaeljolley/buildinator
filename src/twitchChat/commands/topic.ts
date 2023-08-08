import {Events} from '../../constants';
import {EventBus} from '../../events';
import {OnCommandEvent} from '../../types/events/onCommandEvent';
import { OnTopicEvent } from '../../types/events/onTopicEvent';

/**
 * Sends command to stop A/V effects
 * @param onCommandEvent
 */
export function topic(onCommandEvent: OnCommandEvent): void {
  // Only the broadcaster & mods should be able to set the topic
  if (onCommandEvent.flags.broadcaster || onCommandEvent.flags.mod) {

    const user = onCommandEvent.user;
    const incomingMessage = onCommandEvent.message;
    const topic = incomingMessage.replace('!topic ', '');

    // Send the message to Twitch chat
    EventBus.eventEmitter.emit(Events.OnSay, new OnTopicEvent(user, topic));
  }
}
