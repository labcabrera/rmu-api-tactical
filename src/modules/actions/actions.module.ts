import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/modules/auth/auth.module';
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
import { PrepareAttackHandler } from './application/cqrs/handlers/prepare-attack.handler';
import { ResolveMovementHandler } from './application/cqrs/handlers/resolve-movement.handler';
import { UpdateAttackRollHandler } from './application/cqrs/handlers/update-attack-roll.handler';
import { UpdateCriticalRollHandler } from './application/cqrs/handlers/update-critical-roll.handler';
import { MovementProcessorService } from './application/services/movement-processor.service';
import { ApiAttackClientAdapter } from './infrastructure/api-clients/api.attack.adapter';
import { ApiManeuverAdapter } from './infrastructure/api-clients/api.maneuver.adapter';
import { MongoActionRepository } from './infrastructure/db/mongo.action.repository';
import { KafkaActionEventBusAdapter } from './infrastructure/messaging/kafka.action-event-bus.adapter';
import { ActionModel, ActionSchema } from './infrastructure/persistence/models/action.model';
import { AttackController } from './interfaces/http/action-attack.controller';
import { ActionController } from './interfaces/http/action.controller';

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
  controllers: [ActionController, AttackController],
  providers: [
    MovementProcessorService,
    GetActionQueryHandler,
    GetActionsQueryHandler,
    CreateActionHandler,
    DeleteActionHandler,
    ResolveMovementHandler,
    PrepareAttackHandler,
    DeclareParryHandler,
    UpdateAttackRollHandler,
    UpdateCriticalRollHandler,
    ApplyAttackHandler,
    {
      provide: 'ActionRepository',
      useClass: MongoActionRepository,
    },
    {
      provide: 'ActionEventBus',
      useClass: KafkaActionEventBusAdapter,
    },
    {
      provide: 'AttackPort',
      useClass: ApiAttackClientAdapter,
    },
    {
      provide: 'ManeuverPort',
      useClass: ApiManeuverAdapter,
    },
  ],
  exports: ['ActionRepository'],
})
export class ActionsModule {}
