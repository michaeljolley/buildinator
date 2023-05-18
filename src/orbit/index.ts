import querystring from 'querystring';
import * as dotenv from 'dotenv';
dotenv.config();

import {OrbitIdentity} from '../types/orbitIdentity';
import {OrbitMember} from '../types/orbitMember';
import {OrbitActivity} from '../types/orbityActivity';
import {LogArea, LogLevel, log} from '../log';

export abstract class Orbit {
  private static ORBIT_API_KEY: string = process.env.ORBIT_API_KEY as string;
  private static ORBIT_BASE_API_URL = 'https://app.orbit.love/api/v1';
  private static ORBIT_WORKSPACE: string = process.env
    .ORBIT_WORKSPACE as string;

  private static membersSlug = `${this.ORBIT_BASE_API_URL}/${this.ORBIT_WORKSPACE}/members`;
  private static activitiesSlug = `${this.ORBIT_BASE_API_URL}/${this.ORBIT_WORKSPACE}/activities`;

  private static orbitHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${this.ORBIT_API_KEY}`,
  };

  /**
   * Adds or updates a member in Orbit
   * @param identity Orbit identity object of a member
   */
  static async addMember(identity: OrbitIdentity): Promise<void> {
    try {
      await this.sendRequest(this.membersSlug, 'POST', identity);
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
        `${this.membersSlug}/find?${queryParams}`,
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
      await this.sendRequest(this.activitiesSlug, 'POST', {activity, identity});
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
      await this.sendRequest(this.activitiesSlug, 'POST', {
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
      headers: this.orbitHeaders,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await response.json();
    return data;
  }
}
