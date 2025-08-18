import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from 'src/modules/auth/auth.module';
import { CoreModule } from '../core/core.module';
import { CreateGameCommandHandler } from './application/commands/handlers/create-game.command.handler';
import { DeleteGameCommandHandler } from './application/commands/handlers/delete-game.command.handler';
import { UpdateGameCommandHandler } from './application/commands/handlers/update-game.command.handler';
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
    CreateGameCommandHandler,
    UpdateGameCommandHandler,
    DeleteGameCommandHandler,
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
