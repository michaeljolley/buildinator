import Express from 'express';
import { BuildinatorConfig } from '../types/buildinatorConfig';
import { webhooksRouter } from './webhooks';
import { overlayRouter } from './overlays';

/**
 * The WWW class is static for the entire application. It is responsible
 * for listening to HTTP requests and raising them to the EventBus.
 */
export default abstract class WWW {
  private static _config: BuildinatorConfig;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static init(app: any, config: BuildinatorConfig): void {
    this._config = config;

    app.use(Express.json());
    app.use('/overlays', overlayRouter);
    app.use('/webhooks', webhooksRouter(this._config));
  }
}
