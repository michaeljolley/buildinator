import {Stream} from '../types/stream';
import {User} from '../types/user';
import {CacheType} from './cacheType';

type Store = {
  users: Record<string, User>;
  streams: Record<string, Stream>;
};

export abstract class Cache {
  private static store: Store = {
    users: {},
    streams: {},
  };

  public static get(
    cacheType: CacheType,
    identifier: string,
  ): User | Stream | undefined {
    return this.store[cacheType][identifier];
  }

  public static set(cacheType: CacheType, object: User | Stream): void {
    const identifier =
      cacheType === CacheType.User
        ? (object as User).id
        : (object as Stream).streamDate;
    this.store[cacheType][identifier] = object;
  }
}
