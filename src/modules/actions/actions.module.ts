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
import { CreateActionHandler } from './application/cqrs/handlers/create-action.handler';
import { DeleteActionHandler } from './application/cqrs/handlers/delete-action.handler';
import { GetActionQueryHandler } from './application/cqrs/handlers/get-action.handler';
import { GetActionsQueryHandler } from './application/cqrs/handlers/get-actions.handler';
import { PrepareAttackHandler } from './application/cqrs/handlers/prepare-attack.handler';
import { ResolveMovementHandler } from './application/cqrs/handlers/resolve-movement.handler';
import { FatigueProcessorService } from './domain/services/fatigue-processor.service';
import { MovementProcessorService } from './domain/services/movement-processor.service';
import { ApiAttackClientAdapter } from './infrastructure/clients/api.attack-client.adapter';
import { MongoActionRepository } from './infrastructure/db/mongo.action.repository';
import { KafkaActionEventBusAdapter } from './infrastructure/messaging/kafka.action-event-bus.adapter';
import { ActionModel, ActionSchema } from './infrastructure/persistence/models/action.model';
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
  controllers: [ActionController],
  providers: [
    MovementProcessorService,
    FatigueProcessorService,
    GetActionQueryHandler,
    GetActionsQueryHandler,
    CreateActionHandler,
    DeleteActionHandler,
    ResolveMovementHandler,
    PrepareAttackHandler,
    {
      provide: 'ActionRepository',
      useClass: MongoActionRepository,
    },
    {
      provide: 'ActionEventBus',
      useClass: KafkaActionEventBusAdapter,
    },
    {
      provide: 'AttackClient',
      useClass: ApiAttackClientAdapter,
    },
  ],
  exports: ['ActionRepository'],
})
export class ActionsModule {}
