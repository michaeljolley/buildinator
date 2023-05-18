import Express from 'express';
import http from 'http';
import {LogArea, LogLevel, log} from '../log';
import {BuildinatorConfig} from '../types/buildinatorConfig';
import {webhooksRouter} from './webhooks';
import {overlayRouter} from './overlays';
import {WebSockets} from '../websockets';

/**
 * The WWW class is static for the entire application. It is responsible
 * for listening to HTTP requests and raising them to the EventBus.
 */
export default abstract class WWW {
  private static _config: BuildinatorConfig;

  public static init(config: BuildinatorConfig): void {
    this._config = config;

    const app = Express();
    const server = http.createServer(app);
    new WebSockets(server, config);

    app.use(Express.json());

    app.use('/overlays', overlayRouter);
    app.use('/webhooks', webhooksRouter(this._config));

    app.listen(this._config.WWW_PORT, () =>
      log(
        LogLevel.Info,
        LogArea.WWW,
        `WWW server is listening on port ${this._config.WWW_PORT}`,
      ),
    );
  }
}
