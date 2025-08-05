import { Logger } from '@application/ports/logger';
import { config } from '@infrastructure/config/config';
import { injectable } from 'inversify';
import pino from 'pino';

@injectable()
export class PinoLogger implements Logger {
  private readonly logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: config.logger.level,
      transport:
        config.logger.mode === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    });
  }

  info(message: string, meta?: any) {
    this.logger.info(meta || {}, message);
  }
  warn(message: string, meta?: any) {
    this.logger.warn(meta || {}, message);
  }
  error(message: string, meta?: any) {
    this.logger.error(meta || {}, message);
  }
  debug(message: string, meta?: any) {
    this.logger.debug(meta || {}, message);
  }
}
