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
import { AddGameActorsCommandHandler } from './application/handlers/add-game-actors.handler';
import { AddGameFactionsCommandHandler } from './application/handlers/add-game-factions.handler';
import { CreateGameCommandHandler } from './application/handlers/create-game.handler';
import { DeleteGameActorsCommandHandler } from './application/handlers/delete-game-actors.handler';
import { DeleteGameFactionsCommandHandler } from './application/handlers/delete-game-factions.handler';
import { DeleteGameCommandHandler } from './application/handlers/delete-game.handler';
import { DeleteGamesByStrategicIdHandler } from './application/handlers/delete-games-by-strategic-id.handler';
import { GetGameQueryHandler } from './application/handlers/get-game.handler';
import { GetGamesQueryHandler } from './application/handlers/get-games.handler';
import { StartPhaseCommandHandler } from './application/handlers/start-phase.handler';
import { StartRoundCommandHandler } from './application/handlers/start-round.handler';
import { UpdateGameCommandHandler } from './application/handlers/update-game.handler';
import { KafkaGameEventBusAdapter } from './infrastructure/messaging/kafka.game-bus.adapter';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game.model';
import { MongoGameRepository } from './infrastructure/persistence/repositories/mongo-game.repository';
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
    GetGamesQueryHandler,
    GetGameQueryHandler,
    CreateGameCommandHandler,
    UpdateGameCommandHandler,
    DeleteGameCommandHandler,
    StartRoundCommandHandler,
    StartPhaseCommandHandler,
    AddGameFactionsCommandHandler,
    AddGameActorsCommandHandler,
    DeleteGameFactionsCommandHandler,
    DeleteGameActorsCommandHandler,
    DeleteGamesByStrategicIdHandler,
    {
      provide: 'GameRepository',
      useClass: MongoGameRepository,
    },
    {
      provide: 'GameEventProducer',
      useClass: KafkaGameEventBusAdapter,
    },
  ],
  exports: ['GameRepository'],
})
export class GamesModule {}
