import {User} from '../user';
import {UserEvent} from '../userEvent';
import {UserEventType} from '../../constants';

export class OnPartEvent extends UserEvent {
  constructor(user: User, public self: boolean) {
    super(user, UserEventType.Part);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
}
