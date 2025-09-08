import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/modules/auth/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { StrategicModule } from '../strategic/strategic.module';

import { AddEffectHandler } from './application/cqrs/handlers/add-effect.handler';
import { AddHpHandler } from './application/cqrs/handlers/add-hp.handler';
import { CreateActorRoundHandler } from './application/cqrs/handlers/create-actor-round.handler';
import { GetActorRoundHandler } from './application/cqrs/handlers/get-actor-round.query.handler';
import { GetActorRoundsHandler } from './application/cqrs/handlers/get-actor-rounds.query.handler';
import { DeclareInitiativeCommandHandler } from './application/cqrs/handlers/update-initiative.handler';
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
    CreateActorRoundHandler,
    DeclareInitiativeCommandHandler,
    GetActorRoundHandler,
    GetActorRoundsHandler,
    AddHpHandler,
    AddEffectHandler,
    {
      provide: 'ActorRoundRepository',
      useClass: MongoActorRoundRepository,
    },
  ],
  exports: ['ActorRoundRepository'],
})
export class ActorsRoundModule {}
