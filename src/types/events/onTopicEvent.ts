import {User} from '../user';
import {UserEvent} from '../userEvent';
import {UserEventType} from '../../constants';

export class OnTopicEvent extends UserEvent {
  constructor(user: User, public topic: string) {
    super(user, UserEventType.Raid);
  }
}
