import { Router, Request } from 'express';
import crypto from 'crypto';
import { EventBus } from '../../events';
import { Events } from '../../constants';
import { BuildinatorConfig } from '../../types/buildinatorConfig';
import TwitchAPI from '../../twitchAPI';
import { TwitchFollowEvent } from '../../types/twitchFollowEvent';
import { TwitchStreamEvent } from '../../types/twitchStreamEvent';
import { LogArea, LogLevel, log } from '../../log';

export function webhooksRouter(config: BuildinatorConfig): Router {
  const router = Router();

  /**
   * This endpoint is used by Pipedream to send a webhook when an event is
   * created or updated in Notion.
   */
  router.use('/gatherings', (req, res) => {
    EventBus.eventEmitter.emit(Events.GatheringScheduled, req.body);
    res.status(200).send();
  });

  /**
   * This endpoint is used by Pipedream to send a webhook when it's time to
   * say something in Discord.
   */
  router.use('/discord-say', (req, res) => {
    EventBus.eventEmitter.emit(Events.DiscordSay, req.body);
    res.status(200).send();
  });

  router.use('/hookdeck/twitch', (req, res) => {
    if (!verifyHeaders(req))
      res.status(422).send();

    switch (req.body.subscription.type) {
      case "channel.follow":
        TwitchAPI.clientHandleOnFollow(req.body.event as TwitchFollowEvent);
        break;
      case "stream.online":
        TwitchAPI.clientHandleStreamOnline(req.body.event as TwitchStreamEvent);
        break;
      case "stream.offline":
        TwitchAPI.clientHandleStreamOffline();
        break;
    }

    res.status(200).send();
  });

  /**
   * This endpoint is used by GitHub to send a webhook when an commit is merged
   * in the builders-club organization.
   */
  router.use('/github', (req, res) => {
    const validateGitHubWebhook = (request: Request) => {
      // calculate the signature
      const expectedSignature =
        'sha1=' +
        crypto
          .createHmac('sha1', config.GITHUB_WEBHOOK_SECRET as string)
          .update(JSON.stringify(request.body))
          .digest('hex');

      // compare the signature against the one in the request
      const signature = request.headers['x-hub-signature'];
      if (signature !== expectedSignature) {
        throw new Error('Invalid signature.');
      }
    };
    validateGitHubWebhook(req);
    EventBus.eventEmitter.emit(Events.PullRequestMerged, req.body);
    res.status(200).send();
  });

  const verifyHeaders = (request: Request & { rawBody?: Buffer }): boolean => {
    if (verifyHookDeckSignature(request) &&
      verifyTwitchSignature(request)) {
      return true;
    }
    return false;
  }

  const verifyHookDeckSignature = (request: Request & { rawBody?: Buffer }): boolean => {

    if (request.rawBody) {
      const hmacHeader = request.get('x-hookdeck-signature');
      const hmacHeader2 = request.get('x-hookdeck-signature-2');

      //Create a hash based on the parsed body
      const hash = crypto.createHmac('sha256', config.HOOKDECK_SIGNING_SECRET).update(request.rawBody).digest('base64');

      // Compare the created hash with the value of the x-hookdeck-signature and x-hookdeck-signature-2 headers
      if (hash === hmacHeader || hash === hmacHeader2) {
        return true;
      }
    }

    return false;
  }

  const verifyTwitchSignature = (request: Request & { rawBody?: Buffer }): boolean => {

    const givenSignature = request.headers['twitch-eventsub-message-signature'];

    if (!givenSignature) {
      return false;
    }

    const digest = crypto.createHmac('sha256', config.TWITCH_WEBHOOK_SECRET)
      .update((request.headers['twitch-eventsub-message-id'] as string + request.headers['twitch-eventsub-message-timestamp'] as string + request.rawBody) as string)
      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(`sha256=${digest}`), Buffer.from(givenSignature as string))) {
      return true;
    }
    return false;
  }

  return router;
}
