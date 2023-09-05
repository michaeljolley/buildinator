import * as path from 'path';
import * as fs from 'fs';
import { Command } from '../types/command';
import { OnCommandEvent } from '../types/events/onCommandEvent';

export abstract class CommandRegistry {
  private static commands: Array<Command> = [];

  public static init(): void {
    this.commands = [];

    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const command = require(filePath).default
      if (!filePath.includes('_')) {
        this.commands.push(new Command(file.split('.')[0].toLocaleLowerCase(), command as unknown as (onCommandEvent: OnCommandEvent) => void));
      }
    }
  }

  public static getCommand(commandName: string): Command | undefined {
    return this.commands.find(f => f?.commandName === commandName);
  }

  public static getCommands(): Array<Command> {
    return this.commands;
  }
}
