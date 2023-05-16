import Express from 'express';
import {EventBus} from '../events';
import {Events, PORT} from '../constants';
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

    app.listen(PORT, '0.0.0.0', () =>
      log(
        LogLevel.Info,
        LogArea.Webhooks,
        `Webhooks server is listening on port ${PORT}`,
      ),
    );
  }
}
