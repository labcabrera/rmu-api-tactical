import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';

import { Logger } from '@domain/ports/logger';

import { errorHandler } from '@infrastructure/adapters/inbound/web/error-handler';
import { actionRouter as actionRoutes } from '@infrastructure/adapters/inbound/web/routes/action.routes';
import { characterRoundRoutes } from '@infrastructure/adapters/inbound/web/routes/character-round.routes';
import { characterRouter as characterRoutes } from '@infrastructure/adapters/inbound/web/routes/character.routes';
import { gameRouter as gameRoutes } from '@infrastructure/adapters/inbound/web/routes/game.routes';

import { container } from '@shared/container';
import { config } from '../../../../config/config';

export class ExpressApp {
  private app: Application;
  private logger: Logger = container.get('Logger');

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeDatabase();
    this.initializeRoutes();
    //TODO update spec and fix
    // this.initializeSwagger();
    this.app.use(errorHandler);
  }

  private initializeMiddleware(): void {
    this.app.use(express.json());
    this.app.use(cors());
  }

  private initializeDatabase(): void {
    mongoose
      .connect(config.mongoUri)
      .then(() => this.logger.info('Connected to ' + config.mongoUri))
      .catch((err: Error) => this.logger.error('Error connecting to ' + config.mongoUri, err));
  }

  private initializeRoutes(): void {
    this.app.use('/v1/tactical-games', gameRoutes);
    this.app.use('/v1/characters', characterRoutes);
    this.app.use('/v1/characters-rounds', characterRoundRoutes);
    this.app.use('/v1/tactical-actions', actionRoutes);
  }

  private initializeSwagger(): void {
    try {
      const openapiFilePath: string = path.join(__dirname, '../../../../../openapi.yaml');
      console.log('Loading OpenAPI documentation...');
      const openapiFile: string = fs.readFileSync(openapiFilePath, 'utf8');
      const swaggerDocument = yaml.parse(openapiFile);

      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } catch (error) {
      console.warn('Could not load OpenAPI documentation:', error);
    }
  }

  private initializeErrorHandling(): void {
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.status(404).json({
        code: '404',
        message: 'Invalid path',
        timestamp: new Date().toISOString(),
      });
    });
  }

  public getApp(): Application {
    return this.app;
  }
}
