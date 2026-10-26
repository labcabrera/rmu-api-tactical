import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../shared/infrastructure/security/auth.module.js';
import { GamesModule } from '../games/games.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { StrategicModule } from '../strategic/strategic.module.js';
import { AddEffectsHandler } from './application/cqrs/handlers/add-effects.handler.js';
import { AddFatigueHandler } from './application/cqrs/handlers/add-fatigue.handler.js';
import { AdjustHpHandler } from './application/cqrs/handlers/adjust-hp.handler.js';
import { DeleteInjuryHandler } from './application/cqrs/handlers/delete-injury.handler.js';
import { UpdateInjuryHandler } from './application/cqrs/handlers/update-injury.handler.js';
import { CreateActorRoundHandler } from './application/cqrs/handlers/create-actor-round.handler.js';
import { DeclareActorParryHandler } from './application/cqrs/handlers/declare-actor-parry.handler.js';
import { DeclareDefenseModeHandler } from './application/cqrs/handlers/declare-defense-mode.handler.js';
import { DeleteEffectHandler } from './application/cqrs/handlers/delete-effect.handler.js';
import { ResolveAlertHandler } from './application/cqrs/handlers/resolve-alert.handler.js';
import { GetActorRoundHandler } from './application/cqrs/handlers/get-actor-round.handler.js';
import { GetActorRoundsHandler } from './application/cqrs/handlers/get-actor-rounds.handler.js';
import { SubstractBoHandler } from './application/cqrs/handlers/substract-bo.handler.js';
import { DeclareInitiativeCommandHandler } from './application/cqrs/handlers/update-initiative.handler.js';
import { UpkeepActorRoundHandler } from './application/cqrs/handlers/upkeep-actor-round.handler.js';
import { MongoActorRoundRepository } from './infrastructure/db/mongo.actor-round.repository.js';
import { ActorRoundCharacterMapperAdapter } from './infrastructure/mappers/actor-round-character-mapper.adapter.js';
import { ActorRoundModel, ActorRoundSchema } from './infrastructure/persistence/models/actor-round.model.js';
import { ActorRoundController } from './interfaces/http/actor-round.controller.js';

import { ACTOR_ROUND_CHARACTER_MAPPER_PORT } from './application/ports/actor-round-character-mapper.port.js';
import { ACTOR_ROUND_REPOSITORY } from './application/ports/actor-round-repository.port.js';
import { FIGHTING_STYLES_PORT } from './application/ports/fighting-styles.port.js';
import { ApiFightingStylesAdapter } from './infrastructure/api-clients/api.fighting-styles.adapter.js';
import { DeclareFightingStyleHandler } from './application/cqrs/handlers/declare-fighting-style.handler.js';
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
    ResolveAlertHandler,
    UpkeepActorRoundHandler,
    SubstractBoHandler,
    DeclareActorParryHandler,
    DeclareDefenseModeHandler,
    DeclareFightingStyleHandler,
    AddFatigueHandler,
    AdjustHpHandler,
    UpdateInjuryHandler,
    DeleteInjuryHandler,
    {
      provide: ACTOR_ROUND_REPOSITORY,
      useClass: MongoActorRoundRepository,
    },
    {
      provide: FIGHTING_STYLES_PORT,
      useClass: ApiFightingStylesAdapter,
    },
    {
      provide: ACTOR_ROUND_CHARACTER_MAPPER_PORT,
      useClass: ActorRoundCharacterMapperAdapter,
    },
  ],
  exports: [ACTOR_ROUND_REPOSITORY],
})
export class ActorsRoundModule {}
