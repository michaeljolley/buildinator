import {
  OnResubExtra,
  OnSubExtra,
  OnSubGiftExtra,
  OnSubMysteryGiftExtra,
} from 'comfy.js';
import {SubMethods} from 'tmi.js';

import {User} from '../user';
import {UserEvent} from '../userEvent';
import {UserEventType} from '../../constants';

export class OnSubEvent extends UserEvent {
  constructor(
    user: User,
    public message: string,
    public subTierInfo: SubMethods,
    public extra:
      | OnSubExtra
      | OnResubExtra
      | OnSubGiftExtra
      | OnSubMysteryGiftExtra,
    public cumulativeMonths?: number,
    public subGifter?: User,
  ) {
    super(user, UserEventType.Sub);
    this.event = {
      message,
      subTierInfo,
    };
  }

  event: {
    message: string;
    subTierInfo: SubMethods;
  };
}
