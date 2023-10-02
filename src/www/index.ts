import Express from 'express';
import { BuildinatorConfig } from '../types/buildinatorConfig';
import { webhooksRouter } from './webhooks';
import { overlayRouter } from './overlays';

/**
 * The WWW function adds all routes for the public facing site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function WWW(app: any, config: BuildinatorConfig) {
  app.use(Express.json({
    // Store the rawBody buffer on the request
    verify: (req, res, buf) => {
      (req as unknown as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }));
  app.use('/overlays', overlayRouter);
  app.use('/webhooks', webhooksRouter(config));
}
