import { Logger } from '@domain/ports/logger';
import { PinoLogger } from '@infrastructure/logger/pino-logger';
import { Container } from 'inversify';
import 'reflect-metadata';

const container = new Container();

container.bind<Logger>('Logger').to(PinoLogger).inSingletonScope();

export { container };
