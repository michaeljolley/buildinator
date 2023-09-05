import { Events } from '../../constants';
import { EventBus } from '../../events';
import { OnCommandEvent } from '../../types/events/onCommandEvent';
import { OnStopEvent } from '../../types/events/onStopEvent';

/**
 * Sends command to stop A/V effects
 * @param onCommandEvent
 */
export default function (onCommandEvent: OnCommandEvent): void {
  // Only the broadcaster & mods should be able to stop effects
  if (onCommandEvent.flags.broadcaster || onCommandEvent.flags.mod) {
    // Send the message to Twitch chat
    EventBus.eventEmitter.emit(Events.OnStop, new OnStopEvent());
  }
}
