import {OnMessageExtra, OnMessageFlags} from 'comfy.js';
import {User} from '../user';
import {UserEvent} from '../userEvent';
import {UserEventType} from '../../constants';

export class OnChatMessageEvent extends UserEvent {
  constructor(
    user: User,
    public message: string,
    public sanitizedMessage: string,
    public flags: OnMessageFlags,
    public self: boolean,
    public extra: OnMessageExtra,
    public id: string,
    public emotes?: string[],
  ) {
    super(user, UserEventType.ChatMessage);
    this.event = {message};
  }

  event: {
    message: string;
  };
}
