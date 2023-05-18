import {Events} from '../../constants';
import {EventBus} from '../../events';
import {OnSayEvent} from '../../types/events/onSayEvent';

import {CommandRegistry} from '../commandRegistry';

/**
 * Sends a message to chat listing all available commands
 * @param onCommandEvent
 */
export function help(): void {
  const commands = CommandRegistry.getCommands()
    .map(c => {
      return `!${c.commandName}`;
    })
    .join(', ');

  const message = `I can respond to the following commands: ${commands}`;

  // Send the message to Twitch chat
  EventBus.eventEmitter.emit(Events.OnSay, new OnSayEvent(message));
}
