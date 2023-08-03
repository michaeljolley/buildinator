import {Events} from '../../constants';
import {EventBus} from '../../events';
import {OnCommandEvent} from '../../types/events/onCommandEvent';
import {OnClearEvent} from '../../types/events/onClearEvent';

/**
 * Sends command to clear Twitch chat overlays
 * @param onCommandEvent
 */
export function clear(onCommandEvent: OnCommandEvent): void {
  // Only the broadcaster & mods should be able to stop effects
  if (onCommandEvent.flags.broadcaster || onCommandEvent.flags.mod) {
    // Send the message to Twitch chat
    EventBus.eventEmitter.emit(Events.OnStop, new OnClearEvent());
  }
}
