import {User} from '../user';
import {OnCommandExtra, OnMessageFlags} from 'comfy.js';
import {UserEvent} from '../userEvent';
import {UserEventType} from '../../constants';

export class OnCommandEvent extends UserEvent {
  constructor(
    user: User,
    public command: string,
    public message: string,
    public flags: OnMessageFlags,
    public extra: OnCommandExtra,
  ) {
    super(user, UserEventType.Command);
    this.event = {
      message,
      command,
    };
  }

  event: {
    message: string;
    command: string;
  };
}
