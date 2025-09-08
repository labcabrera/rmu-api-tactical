import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ActionsModule } from '../actions/actions.module';
import { ActorsRoundModule } from '../actor-rounds/actor-rounds.module';
import { SharedModule } from '../shared/shared.module';
import { StrategicModule } from '../strategic/strategic.module';
import { AddGameActorsHandler } from './application/cqrs/handlers/add-game-actors.handler';
import { AddGameFactionsHandler } from './application/cqrs/handlers/add-game-factions.handler';
import { CreateGameHandler } from './application/cqrs/handlers/create-game.handler';
import { DeleteGameActorsHandler } from './application/cqrs/handlers/delete-game-actors.handler';
import { DeleteGameFactionsHandler } from './application/cqrs/handlers/delete-game-factions.handler';
import { DeleteGameHandler } from './application/cqrs/handlers/delete-game.handler';
import { DeleteGamesByStrategicIdHandler } from './application/cqrs/handlers/delete-games-by-strategic-id.handler';
import { GetGameHandler } from './application/cqrs/handlers/get-game.handler';
import { GetGamesHandler } from './application/cqrs/handlers/get-games.handler';
import { StartPhaseHandler } from './application/cqrs/handlers/start-phase.handler';
import { StartRoundHandler } from './application/cqrs/handlers/start-round.handler';
import { UpdateGameHandler } from './application/cqrs/handlers/update-game.handler';
import { MongoGameRepository } from './infrastructure/db/mongo-game.repository';
import { KafkaGameEventBusAdapter } from './infrastructure/messaging/kafka.game-bus.adapter';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game.model';
import { GameController } from './interfaces/http/game.controller';
import { StrategicGameKafkaConsumer } from './interfaces/messaging/kafka.strategic-game.consumer';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: GameModel.name, schema: GameSchema }]),
    AuthModule,
    SharedModule,
    StrategicModule,
    forwardRef(() => ActorsRoundModule),
    forwardRef(() => ActionsModule),
  ],
  controllers: [GameController, StrategicGameKafkaConsumer],
  providers: [
    KafkaGameEventBusAdapter,
    GetGamesHandler,
    GetGameHandler,
    CreateGameHandler,
    UpdateGameHandler,
    DeleteGameHandler,
    StartRoundHandler,
    StartPhaseHandler,
    AddGameFactionsHandler,
    AddGameActorsHandler,
    DeleteGameFactionsHandler,
    DeleteGameActorsHandler,
    DeleteGamesByStrategicIdHandler,
    {
      provide: 'GameRepository',
      useClass: MongoGameRepository,
    },
    {
      provide: 'GameEventBus',
      useClass: KafkaGameEventBusAdapter,
    },
  ],
  exports: ['GameRepository'],
})
export class GamesModule {}
