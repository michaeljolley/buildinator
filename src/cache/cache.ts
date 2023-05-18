import {User} from '../types/user';
import {CacheType} from './cacheType';

type Store = {
  users: Record<string, User>;
};

export abstract class Cache {
  private static store: Store = {
    users: {},
  };

  public static get(cacheType: CacheType, identifier: string): unknown {
    return this.store[cacheType][identifier];
  }

  public static set(cacheType: CacheType, object: User): void {
    const identifier = object.id;
    this.store[cacheType][identifier] = object;
  }
}
