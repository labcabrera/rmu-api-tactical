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
import { AddGameActorsCommandHandler } from './application/commands/handlers/add-game-actors.command.handler';
import { AddGameFactionsCommandHandler } from './application/commands/handlers/add-game-factions.command.handler';
import { CreateGameCommandHandler } from './application/commands/handlers/create-game.command.handler';
import { DeleteGameActorsCommandHandler } from './application/commands/handlers/delete-game-actors.command.handler';
import { DeleteGameFactionsCommandHandler } from './application/commands/handlers/delete-game-factions.command.handler';
import { DeleteGameCommandHandler } from './application/commands/handlers/delete-game.command.handler';
import { StartPhaseCommandHandler } from './application/commands/handlers/start-phase.command.handler';
import { StartRoundCommandHandler } from './application/commands/handlers/start-round.command.handler';
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
    SharedModule,
    StrategicModule,
    forwardRef(() => ActorsRoundModule),
    forwardRef(() => ActionsModule),
  ],
  controllers: [GameController],
  providers: [
    KafkaGameProducerService,
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
      useClass: KafkaGameProducerService,
    },
  ],
  exports: ['GameRepository'],
})
export class GamesModule {}
