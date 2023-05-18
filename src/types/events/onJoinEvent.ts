import {User} from '../user';
import {UserEvent} from '../userEvent';
import {UserEventType} from '../../constants';

export class OnJoinEvent extends UserEvent {
  constructor(user: User, public self: boolean) {
    super(user, UserEventType.Join);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
}
