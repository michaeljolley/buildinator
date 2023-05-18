import {User} from '../user';
import {UserEvent} from '../userEvent';
import {UserEventType} from '../../constants';

export class OnFollowEvent extends UserEvent {
  constructor(user: User) {
    super(user, UserEventType.Follow);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event!: any;
}
