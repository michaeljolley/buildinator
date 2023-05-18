import type {User} from './user';
import type {UserEventType} from '../constants';

export type IUserEvent = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
};

export class UserEvent implements IUserEvent {
  constructor(public user: User, public type: UserEventType) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
}
