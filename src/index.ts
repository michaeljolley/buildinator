import * as dotenv from 'dotenv';
dotenv.config();

import axios, { AxiosResponse } from 'axios';
import qs from 'querystring';

import Discord from './discord';
import TwitchChat from './twitchChat';
import WWW from './www';
import { BuildinatorConfig } from './types/buildinatorConfig';
import { TwitchTokenResponse } from './types/twitchTokenResponse';
import { LogArea, LogLevel, log } from './log';

// Identify the Twitch credentials first
const TwitchClientId = process.env.TWITCH_CLIENT_ID;
const TwitchClientSecret = process.env.TWITCH_CLIENT_SECRET;

const authParams = qs.stringify({
  client_id: TwitchClientId,
  client_secret: TwitchClientSecret,
  grant_type: 'client_credentials',
});

axios
  .post('https://id.twitch.tv/oauth2/token', authParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  })
  .then(init)
  .catch((reason: unknown) =>
    log(LogLevel.Error, LogArea.Init, `Twitch OAuth booboo: ${reason}`),
  );

async function init(response: AxiosResponse<TwitchTokenResponse>) {
  const twitchAuth = response.data;

  const config: BuildinatorConfig = {
    ORBIT_API_KEY: process.env.ORBIT_API_KEY as string,
    ORBIT_WORKSPACE: process.env.ORBIT_WORKSPACE as string,
    GITHUB_WEBHOOK_SECRET: process.env.GH_WEBHOOK_SECRET as string,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID as string,
    DISCORD_CHANNEL_ID_BREW_WITH_ME: process.env
      .DISCORD_CHANNEL_ID_BREW_WITH_ME as string,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN as string,
    PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK: process.env
      .PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK as string,
    WWW_PORT: parseInt(process.env.PORT as string),
    WWW_HOST: process.env.WWW_HOST as string,
    DISCORD_ROLE_BUILDERS: process.env.DISCORD_ROLE_BUILDERS as string,
    TWITCH_BOT_AUTH_TOKEN: process.env.TWITCH_BOT_AUTH_TOKEN as string,
    TWITCH_BOT_USERNAME: process.env.TWITCH_BOT_USERNAME as string,
    TWITCH_CHANNEL_NAME: process.env.TWITCH_CHANNEL_NAME as string,
    TWITCH_CHANNEL_AUTH_TOKEN: twitchAuth.access_token,
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID as string,
    TWITCH_CHANNEL_ID: process.env.TWITCH_CHANNEL_ID as string,
    TWITCH_BOT_CHANNEL_ID: process.env.TWITCH_BOT_CHANNEL_ID as string,
  };

  TwitchChat.init(config);
  Discord.init(config);
  WWW.init(config);
}
