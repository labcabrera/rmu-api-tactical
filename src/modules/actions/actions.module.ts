import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from '../shared/infrastructure/security/auth.module';
import { ResolveEnduranceCheckHandler } from '../actor-rounds/application/cqrs/handlers/resolve-endurance-check.handler';
import { ResolveBreakageCheckHandler } from '../actor-rounds/application/cqrs/handlers/resolve-breakage-check.handler';
import { StabilizeEffectHandler } from '../actor-rounds/application/cqrs/handlers/stabilize-effect.handler';
import { TreatInjuryHandler } from '../actor-rounds/application/cqrs/handlers/treat-injury.handler';
import { MedicalRollService } from '../actor-rounds/application/services/medical-roll.service';
import { ActorsRoundModule } from '../actor-rounds/actor-rounds.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { StrategicModule } from '../strategic/strategic.module';
import { ApplyAttackHandler } from './application/cqrs/handlers/apply-attack.handler';
import { CreateActionHandler } from './application/cqrs/handlers/create-action.handler';
import { DeclareParryHandler } from './application/cqrs/handlers/declare-parry.handler';
import { DeleteActionHandler } from './application/cqrs/handlers/delete-action.handler';
import { GetActionQueryHandler } from './application/cqrs/handlers/get-action.handler';
import { GetActionsQueryHandler } from './application/cqrs/handlers/get-actions.handler';
import { GetManeuverModifiersHandler } from './application/cqrs/handlers/get-maneuver-modifiers.handler';
import { ManageActionPointsHandler } from './application/cqrs/handlers/manage-action-points.handler';
import { UpdateActionHandler } from './application/cqrs/handlers/update-action.handler';
import { PrepareAttackHandler } from './application/cqrs/handlers/prepare-attack.handler';
import { CompleteActionHandler } from './application/cqrs/handlers/complete-action.handler';
import { ResolveManeuverHandler } from './application/cqrs/handlers/resolve-maneuver.handler';
import { ResolveMovementHandler } from './application/cqrs/handlers/resolve-movement.handler';
import { UpdateAttackRollHandler } from './application/cqrs/handlers/update-attack-roll.handler';
import { UpdateCriticalRollHandler } from './application/cqrs/handlers/update-critical-roll.handler';
import { UpdateFumbleRollHandler } from './application/cqrs/handlers/update-fumble-roll.handler';
import {
  COMBAT_PLUGIN_LIST,
  COMBAT_PLUGINS,
  CombatAttackRollResolverService,
  CombatPluginRegistryService,
  CombatProcessor,
} from './application/services/combat';
import { ActionApStateService } from './application/services/action-ap-state.service';
import { MovementProcessorService } from './application/services/movement-processor.service';
import { ManeuverBaseModifiersService } from './application/services/maneuver/maneuver-base-modifiers.service';
import { ManeuverContextService } from './application/services/maneuver/maneuver-context.service';
import { ApiAttackTableAdapter } from './infrastructure/api-clients/api.attack-table.adapter';
import { ApiCriticalTableAdapter } from './infrastructure/api-clients/api.critical-table.adapter';
import { ApiFumbleTableAdapter } from './infrastructure/api-clients/api.fumble-table.adapter';
import { ApiManeuverAdapter } from './infrastructure/api-clients/api.maneuver.adapter';
import { ApiSkillCatalogAdapter } from './infrastructure/api-clients/api.skill-catalog.adapter';
import { MongoActionRepository } from './infrastructure/db/mongo.action.repository';
import { ActionModel, ActionSchema } from './infrastructure/persistence/models/action.model';
import { ActionController } from './interfaces/http/action.controller';
import { AttackController } from './interfaces/http/attack.controller';
import { ManeuverController } from './interfaces/http/maneuver.controller';
import { MovementController } from './interfaces/http/movement.controller';

import { ACTION_REPOSITORY } from './application/ports/action-repository.port';
import { ATTACK_TABLE_PORT } from './application/ports/attack-table.port';
import { CRITICAL_TABLE_PORT } from './application/ports/critical-table.port';
import { FUMBLE_TABLE_PORT } from './application/ports/fumble-table.port';
import { MANEUVER_PORT } from './application/ports/maneuver.port';
import { SKILL_CATALOG_PORT } from './application/ports/skill-catalog.port';
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
