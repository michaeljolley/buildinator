import * as dotenv from 'dotenv';
dotenv.config();

import axios, {AxiosResponse} from 'axios';
import qs from 'querystring';
import express from 'express';
import http from 'http';

import Discord from './discord';
import TwitchChat from './twitchChat';
import WWW from './www';
import {BuildinatorConfig} from './types/buildinatorConfig';
import {LogArea, LogLevel, log} from './log';
import TwitchAPI from './twitchAPI';
import {WebSockets} from './websockets';
import {Logger} from './logger';
import {TwitchTokenResponse} from './types/twitchTokenResponse';

const TWITCH_API = 'https://id.twitch.tv/oauth2/token';

const authParams = qs.stringify({
  client_id: process.env.TWITCH_CLIENT_ID,
  client_secret: process.env.TWITCH_CLIENT_SECRET,
  grant_type: 'client_credentials',
});

axios
  .post(`${TWITCH_API}?${authParams}`)
  .then(init)
  .catch(reason =>
    log(
      LogLevel.Error,
      LogArea.Init,
      `Twitch OAuth booboo: ${JSON.stringify(reason)}`,
    ),
  );

async function init(response: AxiosResponse<TwitchTokenResponse>) {
  const twitchAuth = response.data;

  const config: BuildinatorConfig = {
    ORBIT_API_KEY: process.env.ORBIT_API_KEY as string,
    ORBIT_WORKSPACE: process.env.ORBIT_WORKSPACE as string,
    GITHUB_WEBHOOK_SECRET: process.env.GH_WEBHOOK_SECRET as string,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID as string,
    DISCORD_CHANNEL_ID_ANNOUNCEMENTS: process.env
      .DISCORD_CHANNEL_ID_ANNOUNCEMENTS as string,
    DISCORD_CHANNEL_ID_BREW_WITH_ME: process.env
      .DISCORD_CHANNEL_ID_BREW_WITH_ME as string,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID as string,
    DISCORD_CHANNEL_ID_INTRO: process.env.DISCORD_CHANNEL_ID_INTRO as string,
    DISCORD_CHANNEL_ID_WEEKLY_GOALS: process.env
      .DISCORD_CHANNEL_ID_WEEKLY_GOALS as string,
    DISCORD_CHANNEL_ID_MOD_LOG: process.env
      .DISCORD_CHANNEL_ID_MOD_LOG as string,
    DISCORD_TOKEN: process.env.DISCORD_TOKEN as string,
    HOOKDECK_SIGNING_SECRET: process.env.HOOKDECK_SIGNING_SECRET as string,
    PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK: process.env
      .PIPEDREAM_UPDATE_DISCORD_EVENT_ID_WEBHOOK as string,
    PIPEDREAM_UPDATE_TWITCH_EVENT_ID_WEBHOOK: process.env
      .PIPEDREAM_UPDATE_TWITCH_EVENT_ID_WEBHOOK as string,
    WWW_PORT: parseInt(process.env.WWW_PORT as string),
    WWW_HOST: process.env.WWW_HOST as string,
    DISCORD_ROLE_BUILDERS: process.env.DISCORD_ROLE_BUILDERS as string,
    TWITCH_APP_TOKEN: twitchAuth.access_token,
    TWITCH_AUTH_TOKEN: process.env.TWITCH_AUTH_TOKEN as string,
    TWITCH_AUTH_TOKEN_NO_SCOPE: process.env
      .TWITCH_AUTH_TOKEN_NO_SCOPE as string,
    TWITCH_BOT_AUTH_TOKEN: process.env.TWITCH_BOT_AUTH_TOKEN as string,
    TWITCH_BOT_USERNAME: process.env.TWITCH_BOT_USERNAME as string,
    TWITCH_CHANNEL_NAME: process.env.TWITCH_CHANNEL_NAME as string,
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID as string,
    TWITCH_CHANNEL_ID: process.env.TWITCH_CHANNEL_ID as string,
    TWITCH_BOT_CHANNEL_ID: process.env.TWITCH_BOT_CHANNEL_ID as string,
    TWITCH_WEBHOOK_SECRET: process.env.TWITCH_WEBHOOK_SECRET as string,
  };

  const app = express();
  const server = http.createServer(app);

  new WebSockets(server, config);
  WWW(app, config);

  server.listen(config.WWW_PORT, () =>
    log(
      LogLevel.Info,
      LogArea.WWW,
      `WWW server is listening on port ${config.WWW_PORT}`,
    ),
  );

  Logger.init(config);
  TwitchAPI.init(config);
  TwitchChat.init(config);

  Discord.init(config);

  // close all streams and clean up anything needed for the stream
  // when the process is stopping
  process.on('SIGTERM', () => {
    log(LogLevel.Info, LogArea.Init, 'Shutting down...');
    server.close();
  });
}
