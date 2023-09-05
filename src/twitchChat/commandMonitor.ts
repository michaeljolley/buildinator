import { EventBus } from '../events';
import { Command } from '../types/command';
import { OnCommandEvent } from '../types/events/onCommandEvent';
import { Events } from '../constants';
import { CommandRegistry } from './commandRegistry';
import _SoundEffect from './commands/_soundEffect';

export class CommandMonitor {
  constructor() {
    CommandRegistry.init();

    EventBus.eventEmitter.addListener(
      Events.OnCommand,
      (onCommandEvent: OnCommandEvent) => this.handleCommand(onCommandEvent),
    );
  }

  private handleCommand(onCommandEvent: OnCommandEvent) {
    const command: Command | undefined = CommandRegistry.getCommand(
      onCommandEvent.command,
    );
    if (command) {
      command.command(onCommandEvent);
    } else {
      _SoundEffect(onCommandEvent);
    }
  }
}
