import {OnCheerExtra, OnCheerFlags} from 'comfy.js';
import {User} from '../user';
import {UserEvent} from '../userEvent';
import {UserEventType} from '../../constants';

export class OnCheerEvent extends UserEvent {
  constructor(
    user: User,
    public message: string,
    public bits: number,
    public flags: OnCheerFlags,
    public extra: OnCheerExtra,
  ) {
    super(user, UserEventType.Cheer);
    this.event = {
      message,
      bits,
    };
  }

  event: {
    message: string;
    bits: number;
  };
}
