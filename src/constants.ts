import * as dotenv from 'dotenv';
dotenv.config();

export const ORBIT_API_KEY = process.env.ORBIT_API_KEY;
export const ORBIT_WORKSPACE = process.env.ORBIT_WORKSPACE;
export const ORBIT_BASE_API_URL = 'https://app.orbit.love/api/v1';
export const GITHUB_WEBHOOK_SECRET = process.env.GH_WEBHOOK_SECRET;
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
export const DISCORD_CHANNEL_ID_BREW_WITH_ME =
  process.env.DISCORD_CHANNEL_ID_BREW_WITH_ME;
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
export const PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK =
  process.env.PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK;
export const PORT = parseInt(process.env.PORT as string);
export const DISCORD_ROLE_BUILDERS = process.env.DISCORD_ROLE_BUILDERS;

export const membersSlug = `${ORBIT_BASE_API_URL}/${ORBIT_WORKSPACE}/members`;
export const activitiesSlug = `${ORBIT_BASE_API_URL}/${ORBIT_WORKSPACE}/activities`;

export const orbitHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${ORBIT_API_KEY}`,
};

/**
 * Events emitted from EventBus.
 */
export enum Events {
  GatheringScheduled = 'gathering:scheduled',
  GatheringStart = 'gathering:start',
  GatheringEnd = 'gathering:end',
  ShareableCreated = 'shareable:created',
  PullRequestMerged = 'contributions:pullrequest:merged',
}

export enum OrbitActivities {
  BrewWithMe = 'event:discord:brew_with_me',
}
