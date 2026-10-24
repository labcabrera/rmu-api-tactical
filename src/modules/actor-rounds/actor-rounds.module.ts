import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../shared/infrastructure/security/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { StrategicModule } from '../strategic/strategic.module';
import { AddEffectsHandler } from './application/cqrs/handlers/add-effects.handler';
import { AddFatigueHandler } from './application/cqrs/handlers/add-fatigue.handler';
import { AdjustHpHandler } from './application/cqrs/handlers/adjust-hp.handler';
import { DeleteInjuryHandler } from './application/cqrs/handlers/delete-injury.handler';
import { UpdateInjuryHandler } from './application/cqrs/handlers/update-injury.handler';
import { CreateActorRoundHandler } from './application/cqrs/handlers/create-actor-round.handler';
import { DeclareActorParryHandler } from './application/cqrs/handlers/declare-actor-parry.handler';
import { DeclareDefenseModeHandler } from './application/cqrs/handlers/declare-defense-mode.handler';
import { DeleteEffectHandler } from './application/cqrs/handlers/delete-effect.handler';
import { GetActorRoundHandler } from './application/cqrs/handlers/get-actor-round.handler';
import { GetActorRoundsHandler } from './application/cqrs/handlers/get-actor-rounds.handler';
import { SubstractBoHandler } from './application/cqrs/handlers/substract-bo.handler';
import { DeclareInitiativeCommandHandler } from './application/cqrs/handlers/update-initiative.handler';
import { UpkeepActorRoundHandler } from './application/cqrs/handlers/upkeep-actor-round.handler';
import { MongoActorRoundRepository } from './infrastructure/db/mongo.actor-round.repository';
import { ActorRoundCharacterMapperAdapter } from './infrastructure/mappers/actor-round-character-mapper.adapter';
import { ActorRoundModel, ActorRoundSchema } from './infrastructure/persistence/models/actor-round.model';
import { ActorRoundController } from './interfaces/http/actor-round.controller';

import { ACTOR_ROUND_CHARACTER_MAPPER_PORT } from './application/ports/actor-round-character-mapper.port';
import { ACTOR_ROUND_REPOSITORY } from './application/ports/actor-round-repository.port';
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
    CreateActorRoundHandler,
    DeclareInitiativeCommandHandler,
    GetActorRoundHandler,
    GetActorRoundsHandler,
    AddEffectsHandler,
    DeleteEffectHandler,
    UpkeepActorRoundHandler,
    SubstractBoHandler,
    DeclareActorParryHandler,
    DeclareDefenseModeHandler,
    AddFatigueHandler,
    AdjustHpHandler,
    UpdateInjuryHandler,
    DeleteInjuryHandler,
    {
      provide: ACTOR_ROUND_REPOSITORY,
      useClass: MongoActorRoundRepository,
    },
    {
      provide: ACTOR_ROUND_CHARACTER_MAPPER_PORT,
      useClass: ActorRoundCharacterMapperAdapter,
    },
  ],
  exports: [ACTOR_ROUND_REPOSITORY],
})
export class ActorsRoundModule {}
