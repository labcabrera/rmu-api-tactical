import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from 'src/modules/auth/auth.module';
import { CoreModule } from '../core/core.module';
import { CreateGameUseCase } from './application/commands/handlers/create-game.usecase';
import { DeleteGameUseCase } from './application/commands/handlers/delete-game.usecase';
import { UpdateGameUseCase } from './application/commands/handlers/update-game-use-case';
import { GetGameQueryHandler } from './application/queries/handlers/get-game.query.handler';
import { GetGamesQueryHandler } from './application/queries/handlers/get-games.query.handler';
import { GameController } from './infrastructure/controllers/game.controller';
import { KafkaGameProducerService } from './infrastructure/messaging/kafka-game-producer.service';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game.model';
import { MongoGameRepository } from './infrastructure/persistence/repositories/mongo-game.repository';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: GameModel.name, schema: GameSchema }]),
    AuthModule,
    CoreModule,
  ],
  controllers: [GameController],
  providers: [
    KafkaGameProducerService,
    GetGamesQueryHandler,
    GetGameQueryHandler,
    CreateGameUseCase,
    UpdateGameUseCase,
    DeleteGameUseCase,
    {
      provide: 'GameRepository',
      useClass: MongoGameRepository,
    },
    {
      provide: 'GameEventProducer',
      useClass: KafkaGameProducerService,
    },
  ],
})
export class GamesModule {}
