import {Events} from '../../constants';
import {EventBus} from '../../events';
import {OnCommandEvent} from '../../types/events/onCommandEvent';
import {OnUnmuteEvent} from '../../types/events/onUnmuteEvent';

/**
 * Sends command to unmute all audio effects
 * @param onCommandEvent
 */
export function unmute(onCommandEvent: OnCommandEvent): void {
  // Only the broadcaster & mods should be able to unmute effects
  if (onCommandEvent.flags.broadcaster || onCommandEvent.flags.mod) {
    // Send the message to Twitch chat
    EventBus.eventEmitter.emit(Events.OnUnmute, new OnUnmuteEvent());
  }
}
