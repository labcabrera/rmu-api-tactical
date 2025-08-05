import { Logger } from '@domain/ports/logger';

import { config } from '@infrastructure/config/config';
import { container } from '@shared/container';
import { EventListenerBootstrap } from '../../../../../application/services/event-listener-bootstrap';
import { TYPES } from '../../../../../shared/types';
import { ExpressApp } from './express.app';

export class WebServer {
  private port: number;
  private expressApp: ExpressApp;
  private logger: Logger = container.get('Logger');

  constructor() {
    this.port = config.port;
    this.expressApp = new ExpressApp();
  }

  public start(): void {
    this.expressApp.getApp().listen(this.port, () => {
      this.logger.info(`Server running on port ${this.port}`);
    });
    const bootstrap = container.get(TYPES.EventListenerBootstrap) as EventListenerBootstrap;
    bootstrap.initialize();
  }
}
