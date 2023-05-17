import Express, {Request} from 'express';
import crypto from 'crypto';
import {EventBus} from '../events';
import {Events, GITHUB_WEBHOOK_SECRET, PORT} from '../constants';
import {LogArea, LogLevel, log} from '../log';

/**
 * The Webhooks class is static for the entire application. It is responsible
 * for listening to HTTP requests and raising them to the EventBus.
 */
export default abstract class Webhooks {
  public static init(): void {
    const app = Express();

    app.use(Express.json());

    /**
     * This endpoint is used by Pipedream to send a webhook when an event is
     * created or updated in Notion.
     */
    app.use('/webhooks/gatherings', (req, res) => {
      EventBus.eventEmitter.emit(Events.GatheringScheduled, req.body);
      res.status(200).send();
    });

    /**
     * This endpoint is used by GitHub to send a webhook when an commit is merged
     * in the builders-club organization.
     */
    app.use('/webhooks/github', (req, res) => {
      validateGitHubWebhook(req);
      EventBus.eventEmitter.emit(Events.PullRequestMerged, req.body);
      res.status(200).send();
    });

    app.listen(PORT, () =>
      log(
        LogLevel.Info,
        LogArea.Webhooks,
        `Webhooks server is listening on port ${PORT}`,
      ),
    );
  }
}

function validateGitHubWebhook(request: Request) {
  // calculate the signature
  const expectedSignature =
    'sha1=' +
    crypto
      .createHmac('sha1', GITHUB_WEBHOOK_SECRET as string)
      .update(JSON.stringify(request.body))
      .digest('hex');

  // compare the signature against the one in the request
  const signature = request.headers['x-hub-signature'];
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature.');
  }
}
