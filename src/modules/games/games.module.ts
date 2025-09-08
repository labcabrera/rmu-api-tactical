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
import { AddGameActorsCommandHandler } from './application/handlers/add-game-actors.command.handler';
import { AddGameFactionsCommandHandler } from './application/handlers/add-game-factions.command.handler';
import { CreateGameCommandHandler } from './application/handlers/create-game.command.handler';
import { DeleteGameActorsCommandHandler } from './application/handlers/delete-game-actors.command.handler';
import { DeleteGameFactionsCommandHandler } from './application/handlers/delete-game-factions.command.handler';
import { DeleteGameCommandHandler } from './application/handlers/delete-game.command.handler';
import { GetGameQueryHandler } from './application/handlers/get-game.query.handler';
import { GetGamesQueryHandler } from './application/handlers/get-games.query.handler';
import { StartPhaseCommandHandler } from './application/handlers/start-phase.command.handler';
import { StartRoundCommandHandler } from './application/handlers/start-round.command.handler';
import { UpdateGameCommandHandler } from './application/handlers/update-game.command.handler';
import { GameController } from './infrastructure/controllers/game.controller';
import { KafkaGameBusAdapter } from './infrastructure/messaging/kafka.game-bus.adapter';
import { GameModel, GameSchema } from './infrastructure/persistence/models/game.model';
import { MongoGameRepository } from './infrastructure/persistence/repositories/mongo-game.repository';

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
  controllers: [GameController],
  providers: [
    KafkaGameBusAdapter,
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
    {
      provide: 'GameRepository',
      useClass: MongoGameRepository,
    },
    {
      provide: 'GameEventProducer',
      useClass: KafkaGameBusAdapter,
    },
  ],
  exports: ['GameRepository'],
})
export class GamesModule {}
