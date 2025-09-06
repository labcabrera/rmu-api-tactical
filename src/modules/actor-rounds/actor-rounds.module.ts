import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/modules/auth/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { StrategicModule } from '../strategic/strategic.module';
import { AddHpCommandHandler } from './application/commands/handlers/add-hp.command.handler';
import { DeclareInitiativeCommandHandler } from './application/commands/handlers/update-initiative.command.handler';
import { GetActorRoundQueryHandler } from './application/queries/handlers/get-actor-round.query.handler';
import { GetCharacterRoundsQueryHandler } from './application/queries/handlers/get-actor-rounds.query.handler';
import { ActorRoundService } from './application/services/actor-round-service';
import { ActorRoundController } from './infrastructure/controllers/actor-round.controller';
import { ActorRoundModel, ActorRoundSchema } from './infrastructure/persistence/models/actor-round.model';
import { MongoActorRoundRepository } from './infrastructure/persistence/repositories/mongo-actor-round-model.repository';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: ActorRoundModel.name, schema: ActorRoundSchema }]),
    AuthModule,
    SharedModule,
    GamesModule,
    StrategicModule,
  ],
  controllers: [ActorRoundController],
  providers: [
    ActorRoundService,
    DeclareInitiativeCommandHandler,
    GetActorRoundQueryHandler,
    GetCharacterRoundsQueryHandler,
    AddHpCommandHandler,
    {
      provide: 'ActorRoundRepository',
      useClass: MongoActorRoundRepository,
    },
  ],
  exports: [ActorRoundService, 'ActorRoundRepository'],
})
export class ActorsRoundModule {}
