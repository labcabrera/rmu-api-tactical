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
import { CreateActionCommandHandler } from './application/commands/handlers/create-action.command.handler';
import { DeleteActionCommandHandler } from './application/commands/handlers/delete-action.command.handler';
import { PrepareAttackCommandHandler } from './application/commands/handlers/prepare-attack-command.handler';
import { ResolveMovementCommandHandler } from './application/commands/handlers/resolve-movement.command.handler';
import { GetActionQueryHandler } from './application/queries/handlers/get-action.query.handler';
import { GetActionsQueryHandler } from './application/queries/handlers/get-actions.query.handler';
import { MovementProcessorService } from './domain/services/movement-processor.service';
import { AttackApiClient } from './infrastructure/clients/attack-api-client';
import { ActionController } from './infrastructure/controllers/action.controller';
import { KafkaActionProducerService } from './infrastructure/messaging/kafka-action-producer.service';
import { ActionModel, ActionSchema } from './infrastructure/persistence/models/action.model';
import { MongoActionRepository } from './infrastructure/persistence/repositories/mongo-action.repository';

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
    GetActionQueryHandler,
    GetActionsQueryHandler,
    CreateActionCommandHandler,
    DeleteActionCommandHandler,
    ResolveMovementCommandHandler,
    PrepareAttackCommandHandler,
    {
      provide: 'ActionRepository',
      useClass: MongoActionRepository,
    },
    {
      provide: 'ActionEventProducer',
      useClass: KafkaActionProducerService,
    },
    {
      provide: 'AttackClient',
      useClass: AttackApiClient,
    },
  ],
})
export class ActionsModule {}
