import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/modules/auth/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { StrategicModule } from '../strategic/strategic.module';
import { AddEffectCommandHandler } from './application/commands/handlers/add-effect.command.handler';
import { AddHpCommandHandler } from './application/commands/handlers/add-hp.command.handler';
import { DeclareInitiativeCommandHandler } from './application/commands/handlers/update-initiative.command.handler';
import { GetActorRoundQueryHandler } from './application/queries/handlers/get-actor-round.query.handler';
import { GetCharacterRoundsQueryHandler } from './application/queries/handlers/get-actor-rounds.query.handler';
import { ActorRoundService } from './application/services/actor-round-service';
import { ActorRoundEffectService } from './domain/services/actor-round-effect.service';
import { MongoActorRoundRepository } from './infrastructure/db/mongo-actor-round.repository';
import { ActorRoundModel, ActorRoundSchema } from './infrastructure/persistence/models/actor-round.model';
import { ActorRoundController } from './interfaces/http/actor-round.controller';

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
    ActorRoundEffectService,
    ActorRoundService,
    DeclareInitiativeCommandHandler,
    GetActorRoundQueryHandler,
    GetCharacterRoundsQueryHandler,
    AddHpCommandHandler,
    AddEffectCommandHandler,
    {
      provide: 'ActorRoundRepository',
      useClass: MongoActorRoundRepository,
    },
  ],
  exports: [ActorRoundService, 'ActorRoundRepository'],
})
export class ActorsRoundModule {}
