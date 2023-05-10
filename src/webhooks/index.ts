import Express from 'express';
import { EventBus } from '../events';
import { Events } from '../constants';

export default abstract class Webhooks {
  public static init(): void {
    const app = Express();

    app.use(Express.json());

    app.use('/webhooks/gathering', req => {
      console.dir(req.body);
      EventBus.eventEmitter.emit(Events.GatheringScheduled, req.body);
    });

    app.listen(3000, () =>
      console.log('Webhooks server is listening on port 3000'),
    );
  }
}
