import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../shared/infrastructure/security/auth.module.js';
import { ResolveEnduranceCheckHandler } from '../actor-rounds/application/cqrs/handlers/resolve-endurance-check.handler.js';
import { ResolveBreakageCheckHandler } from '../actor-rounds/application/cqrs/handlers/resolve-breakage-check.handler.js';
import { StabilizeEffectHandler } from '../actor-rounds/application/cqrs/handlers/stabilize-effect.handler.js';
import { TreatInjuryHandler } from '../actor-rounds/application/cqrs/handlers/treat-injury.handler.js';
import { MedicalRollService } from '../actor-rounds/application/services/medical-roll.service.js';
import { ActorsRoundModule } from '../actor-rounds/actor-rounds.module.js';
import { GamesModule } from '../games/games.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { StrategicModule } from '../strategic/strategic.module.js';
import { ApplyAttackHandler } from './application/cqrs/handlers/apply-attack.handler.js';
import { CreateActionHandler } from './application/cqrs/handlers/create-action.handler.js';
import { DeclareParryHandler } from './application/cqrs/handlers/declare-parry.handler.js';
import { DeleteActionHandler } from './application/cqrs/handlers/delete-action.handler.js';
import { GetActionQueryHandler } from './application/cqrs/handlers/get-action.handler.js';
import { GetActionsQueryHandler } from './application/cqrs/handlers/get-actions.handler.js';
import { GetManeuverModifiersHandler } from './application/cqrs/handlers/get-maneuver-modifiers.handler.js';
import { ManageActionPointsHandler } from './application/cqrs/handlers/manage-action-points.handler.js';
import { UpdateActionHandler } from './application/cqrs/handlers/update-action.handler.js';
import { PrepareAttackHandler } from './application/cqrs/handlers/prepare-attack.handler.js';
import { CompleteActionHandler } from './application/cqrs/handlers/complete-action.handler.js';
import { ResolveManeuverHandler } from './application/cqrs/handlers/resolve-maneuver.handler.js';
import { ResolveMovementHandler } from './application/cqrs/handlers/resolve-movement.handler.js';
import { UpdateAttackRollHandler } from './application/cqrs/handlers/update-attack-roll.handler.js';
import { UpdateCriticalRollHandler } from './application/cqrs/handlers/update-critical-roll.handler.js';
import { UpdateFumbleRollHandler } from './application/cqrs/handlers/update-fumble-roll.handler.js';
import {
  COMBAT_PLUGIN_LIST,
  COMBAT_PLUGINS,
  CombatAttackRollResolverService,
  CombatPluginRegistryService,
  CombatProcessor,
} from './application/services/combat/index.js';
import { ActionApStateService } from './application/services/action-ap-state.service.js';
import { MovementProcessorService } from './application/services/movement-processor.service.js';
import { ManeuverBaseModifiersService } from './application/services/maneuver/maneuver-base-modifiers.service.js';
import { ManeuverContextService } from './application/services/maneuver/maneuver-context.service.js';
import { ApiAttackTableAdapter } from './infrastructure/api-clients/api.attack-table.adapter.js';
import { ApiCriticalTableAdapter } from './infrastructure/api-clients/api.critical-table.adapter.js';
import { ApiFumbleTableAdapter } from './infrastructure/api-clients/api.fumble-table.adapter.js';
import { ApiManeuverAdapter } from './infrastructure/api-clients/api.maneuver.adapter.js';
import { ApiSkillCatalogAdapter } from './infrastructure/api-clients/api.skill-catalog.adapter.js';
import { MongoActionRepository } from './infrastructure/db/mongo.action.repository.js';
import { ActionModel, ActionSchema } from './infrastructure/persistence/models/action.model.js';
import { ActionController } from './interfaces/http/action.controller.js';
import { AttackController } from './interfaces/http/attack.controller.js';
import { ManeuverController } from './interfaces/http/maneuver.controller.js';
import { MovementController } from './interfaces/http/movement.controller.js';

import { ACTION_REPOSITORY } from './application/ports/action-repository.port.js';
import { ATTACK_TABLE_PORT } from './application/ports/attack-table.port.js';
import { CRITICAL_TABLE_PORT } from './application/ports/critical-table.port.js';
import { FUMBLE_TABLE_PORT } from './application/ports/fumble-table.port.js';
import { MANEUVER_PORT } from './application/ports/maneuver.port.js';
import { SKILL_CATALOG_PORT } from './application/ports/skill-catalog.port.js';
@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: ActionModel.name, schema: ActionSchema }]),
    AuthModule,
    SharedModule,
    GamesModule,
    StrategicModule,
    ActorsRoundModule,
  ],
  controllers: [ActionController, AttackController, MovementController, ManeuverController],
  providers: [
    ActionApStateService,
    MovementProcessorService,
    ManeuverBaseModifiersService,
    ManeuverContextService,
    CombatPluginRegistryService,
    CombatProcessor,
    CombatAttackRollResolverService,
    GetActionQueryHandler,
    GetActionsQueryHandler,
    GetManeuverModifiersHandler,
    CreateActionHandler,
    UpdateActionHandler,
    ManageActionPointsHandler,
    DeleteActionHandler,
    ResolveMovementHandler,
    ResolveManeuverHandler,
    CompleteActionHandler,
    PrepareAttackHandler,
    DeclareParryHandler,
    UpdateAttackRollHandler,
    UpdateCriticalRollHandler,
    UpdateFumbleRollHandler,
    ApplyAttackHandler,
    // Live in actor-rounds but need the ManeuverPort of this module.
    ResolveEnduranceCheckHandler,
    ResolveBreakageCheckHandler,
    MedicalRollService,
    TreatInjuryHandler,
    StabilizeEffectHandler,
    {
      provide: ACTION_REPOSITORY,
      useClass: MongoActionRepository,
    },
    {
      provide: ATTACK_TABLE_PORT,
      useClass: ApiAttackTableAdapter,
    },
    {
      provide: CRITICAL_TABLE_PORT,
      useClass: ApiCriticalTableAdapter,
    },
    {
      provide: FUMBLE_TABLE_PORT,
      useClass: ApiFumbleTableAdapter,
    },
    {
      provide: MANEUVER_PORT,
      useClass: ApiManeuverAdapter,
    },
    {
      provide: SKILL_CATALOG_PORT,
      useClass: ApiSkillCatalogAdapter,
    },
    {
      provide: COMBAT_PLUGINS,
      useValue: COMBAT_PLUGIN_LIST,
    },
  ],
  exports: [ACTION_REPOSITORY, CombatPluginRegistryService, CombatProcessor],
})
export class ActionsModule {}
