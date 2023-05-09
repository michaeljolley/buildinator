import Express from 'express';
import { EventBus } from '../events';

export default abstract class Webhooks {
    public static init(): void {
        const app = Express();

        app.use(Express.json());

        app.use("/webhooks/gathering", (req) => {
            EventBus.eventEmitter.emit("GatheringScheduled", req.body);
        });

        app.listen(3000, () => console.log('Webhooks server is listening on port 3000'));
    }
}