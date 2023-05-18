import {Router, Request} from 'express';
import crypto from 'crypto';
import {EventBus} from '../../events';
import {Events} from '../../constants';
import {BuildinatorConfig} from '../../types/buildinatorConfig';

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

  return router;
}
