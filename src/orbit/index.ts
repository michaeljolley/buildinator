import querystring from 'querystring';
import {OrbitIdentity} from '../types/orbitIdentity';
import {activitiesSlug, membersSlug, orbitHeaders} from '../constants';
import {OrbitMember} from '../types/orbitMember';
import {OrbitActivity} from '../types/orbityActivity';
import {LogArea, LogLevel, log} from '../log';

export abstract class Orbit {
  /**
   * Adds or updates a member in Orbit
   * @param identity Orbit identity object of a member
   */
  static async addMember(identity: OrbitIdentity): Promise<void> {
    try {
      await this.sendRequest(membersSlug, 'POST', identity);
    } catch (error) {
      log(LogLevel.Error, LogArea.Orbit, `ORBIT: addMember: ${error}`);
    }
  }

  /**
   * Retrieves a member from Orbit
   * @param identity An Orbit identity that identifies a member
   * @returns The found Orbit member or undefined
   */
  static async getMember(
    identity: OrbitIdentity,
  ): Promise<OrbitMember | undefined> {
    try {
      const queryParams = querystring.stringify(identity);
      return await this.sendRequest(
        `${membersSlug}/find?${queryParams}`,
        'GET',
      );
    } catch (error) {
      log(LogLevel.Error, LogArea.Orbit, `ORBIT: getMember: ${error}`);
    }
  }

  /**
   * Adds an activity to an Orbit member. Creates the member if they don't exist.
   * @param activity Activity performed
   * @param identity Member identity
   */
  static async addActivity(
    activity: OrbitActivity,
    identity: OrbitIdentity,
  ): Promise<void> {
    try {
      await this.sendRequest(activitiesSlug, 'POST', {activity, identity});
    } catch (error) {
      log(LogLevel.Error, LogArea.Orbit, `ORBIT: addActivity: ${error}`);
    }
  }

  /**
   * Adds a content activity to an Orbit member. Creates the member if they don't exist.
   * @param url Url of the content created
   * @param identity Member identity
   */
  static async addContentActivity(url: string, identity: OrbitIdentity) {
    try {
      await this.sendRequest(activitiesSlug, 'POST', {
        activity: {
          url,
          activity_type: 'content',
        },
        identity,
      });
    } catch (error) {
      log(LogLevel.Error, LogArea.Orbit, `ORBIT: addContentActivity: ${error}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static async sendRequest(url: string, method: string, payload?: any) {
    const response = await fetch(url, {
      method,
      headers: orbitHeaders,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await response.json();
    return data;
  }
}
