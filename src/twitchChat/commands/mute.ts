import {Events} from '../../constants';
import {EventBus} from '../../events';
import {OnCommandEvent} from '../../types/events/onCommandEvent';
import {OnMuteEvent} from '../../types/events/onMuteEvent';

/**
 * Sends command to mute all audio effects
 * @param onCommandEvent
 */
export function mute(onCommandEvent: OnCommandEvent): void {
  // Only the broadcaster & mods should be able to mute effects
  if (onCommandEvent.flags.broadcaster || onCommandEvent.flags.mod) {
    // Send the message to Twitch chat
    EventBus.eventEmitter.emit(Events.OnMute, new OnMuteEvent());
  }
}
