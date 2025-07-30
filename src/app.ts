import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';

import attackRouter from './routes/attack-controller';
import initiativeRouter from './routes/initiative-controller';
import tacticalActionRouter from './routes/tactical-action-controller';
import tacticalCharactersRouter from './routes/tactical-character-controller';
import tacticalGameRouter from './routes/tactical-game-controller';

const app: Application = express();

const MONGO_URI: string = process.env.RMU_MONGO_TACTICAL_URI || 'mongodb://localhost:27017/rmu-tactical';

const openapiFilePath: string = path.join(__dirname, '../openapi.yaml');
const openapiFile: string = fs.readFileSync(openapiFilePath, 'utf8');
const swaggerDocument = yaml.parse(openapiFile);

app.use(express.json());
app.use(cors());

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to ' + MONGO_URI))
  .catch((err: Error) => console.log('Error connecting to ' + MONGO_URI, err));


app.use('/v1/tactical-games', tacticalGameRouter);
app.use('/v1/characters', tacticalCharactersRouter);
app.use('/v1/actions', tacticalActionRouter);
app.use('/v1/initiative', initiativeRouter);
app.use('/v1/attacks', attackRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req: Request, res: Response) => {
  res.redirect('/api-docs');
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    code: "400",
    message: "Invalid path",
    timestamp: new Date().toISOString()
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    code: "500",
    message: "Internal server error",
    timestamp: new Date().toISOString()
  });
});

export default app;
