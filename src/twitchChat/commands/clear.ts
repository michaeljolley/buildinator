import { Events } from '../../constants';
import { EventBus } from '../../events';
import { OnCommandEvent } from '../../types/events/onCommandEvent';
import { OnClearEvent } from '../../types/events/onClearEvent';

/**
 * Sends command to clear Twitch chat overlays
 * @param onCommandEvent
 */
export default function (onCommandEvent: OnCommandEvent): void {
  // Only the broadcaster & mods should be able to clear the chat overlay
  if (onCommandEvent.flags.broadcaster || onCommandEvent.flags.mod) {
    // Send the message to Twitch chat
    EventBus.eventEmitter.emit(Events.OnClear, new OnClearEvent());
  }
}
