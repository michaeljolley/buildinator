import {
  attention,
  blog,
  conduct,
  discord,
  gitHub,
  help,
  instagram,
  project,
  sfx,
  store,
  stop,
  twitter,
  uses,
  youtube,
  clear,
  bpb,
  topic,
  brainDump,
} from './commands';
import {Command} from '../types/command';

export abstract class CommandRegistry {
  private static commands: Array<Command> = [];

  public static init(): void {
    this.commands = [];

    this.commands.push(new Command('attention', attention));
    this.commands.push(new Command('blog', blog));
    this.commands.push(new Command('bpb', bpb));
    this.commands.push(new Command('braindump', brainDump));
    this.commands.push(new Command('clear', clear));
    this.commands.push(new Command('conduct', conduct));
    this.commands.push(new Command('discord', discord));
    this.commands.push(new Command('github', gitHub));
    this.commands.push(new Command('uses', uses));
    this.commands.push(new Command('help', help));
    this.commands.push(new Command('instagram', instagram));
    this.commands.push(new Command('project', project));
    this.commands.push(new Command('sfx', sfx));
    this.commands.push(new Command('stop', stop));
    this.commands.push(new Command('store', store));
    this.commands.push(new Command('topic', topic));
    this.commands.push(new Command('twitter', twitter));
    this.commands.push(new Command('youtube', youtube));
  }

  public static getCommand(commandName: string): Command | undefined {
    return this.commands.find(f => f?.commandName === commandName);
  }

  public static getCommands(): Array<Command> {
    return this.commands;
  }
}
