import {Cache, CacheType} from '../cache';
import {LogArea, LogLevel, log} from '../log';
import {BuildinatorConfig} from '../types/buildinatorConfig';
import {User} from '../types/user';
import API from './api';

export default abstract class TwitchAPI {
  private static _config: BuildinatorConfig;

  static init(config: BuildinatorConfig) {
    this._config = config;
  }

  static async registerWebSocketSubscriptions(
    sessionId: string,
  ): Promise<void> {
    const api = new API(this._config);
    await api.registerWebSocketSubscriptions(sessionId);
  }

  /**
   * Attempts to retrieve a user from the cache and, if needed, the Twitch API
   * @param login Twitch login of user to retrieve
   */
  public static async getUser(id: string | number): Promise<User | undefined> {
    let user: User | undefined;

    if (Number.isInteger(id)) {
      user = Cache.get(CacheType.User, id.toString()) as User | undefined;
    }

    const date = new Date();
    date.setDate(date.getDate() - 1);

    if (!user || !user.lastUpdated || user.lastUpdated < date) {
      let apiUser: User | undefined;
      try {
        const twitchAPI = new API(this._config);
        apiUser = await twitchAPI.getUser(id);
      } catch (err) {
        log(LogLevel.Error, LogArea.TwitchAPI, `getUser: ${err}`);
      }

      if (apiUser) {
        apiUser.lastUpdated = new Date();
        Cache.set(CacheType.User, apiUser);
      }
    }

    return user;
  }
}
