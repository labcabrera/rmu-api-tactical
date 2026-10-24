import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../shared/infrastructure/security/auth.module.js';
import { ActionsModule } from '../actions/actions.module.js';
import { ActorsRoundModule } from '../actor-rounds/actor-rounds.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { StrategicModule } from '../strategic/strategic.module.js';
import { AddGameActorsHandler } from './application/cqrs/handlers/add-game-actors.handler.js';
import { AddGameFactionsHandler } from './application/cqrs/handlers/add-game-factions.handler.js';
import { ApplyGameHandler } from './application/cqrs/handlers/apply-game.handler.js';
import { FinishGameHandler } from './application/cqrs/handlers/finish-game.handler.js';
import { GetFinishPreviewHandler } from './application/cqrs/handlers/get-finish-preview.handler.js';
import { CreateGameHandler } from './application/cqrs/handlers/create-game.handler.js';
import { DeleteGameActorsHandler } from './application/cqrs/handlers/delete-game-actors.handler.js';
import { DeleteGameFactionsHandler } from './application/cqrs/handlers/delete-game-factions.handler.js';
import { DeleteGameHandler } from './application/cqrs/handlers/delete-game.handler.js';
import { DeleteGamesByStrategicIdHandler } from './application/cqrs/handlers/delete-games-by-strategic-id.handler.js';
import { GetGameHandler } from './application/cqrs/handlers/get-game.handler.js';
import { GetGamesHandler } from './application/cqrs/handlers/get-games.handler.js';
import { RandomizeInitiativesHandler } from './application/cqrs/handlers/randomize-initiatives.handler.js';
import { StartPhaseHandler } from './application/cqrs/handlers/start-phase.handler.js';
import { StartRoundHandler } from './application/cqrs/handlers/start-round.handler.js';
import { UpdateGameHandler } from './application/cqrs/handlers/update-game.handler.js';
import { ApiNpcAdapter } from './infrastructure/api-clients/api.npc.adapter.js';
import { MongoGameRepository } from './infrastructure/db/mongo.game.repository.js';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game.model.js';
import { GameActorController } from './interfaces/http/game-actor.controller.js';
import { GameFactionController } from './interfaces/http/game-faction.controller.js';
import { GameController } from './interfaces/http/game.controller.js';
import { StrategicGameKafkaConsumer } from './interfaces/messaging/kafka.strategic-game.consumer.js';

import { GAME_REPOSITORY } from './application/ports/game-repository.port.js';
import { NPC_PORT } from './application/ports/npc.port.js';
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
  controllers: [GameController, GameActorController, GameFactionController, StrategicGameKafkaConsumer],
  providers: [
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
    RandomizeInitiativesHandler,
    GetFinishPreviewHandler,
    FinishGameHandler,
    ApplyGameHandler,
    {
      provide: GAME_REPOSITORY,
      useClass: MongoGameRepository,
    },
    {
      provide: NPC_PORT,
      useClass: ApiNpcAdapter,
    },
  ],
  exports: [GAME_REPOSITORY],
})
export class GamesModule {}
