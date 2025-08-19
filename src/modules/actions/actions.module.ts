import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from 'src/modules/auth/auth.module';
import { CharactersRoundModule } from '../character-rounds/character-rounds.module';
import { CharactersModule } from '../characters/characters.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { CreateActionCommandHandler } from './application/commands/handlers/create-action.usecase';
import { DeleteActionCommandHandler } from './application/commands/handlers/delete-action.usecase';
import { GetActionQueryHandler } from './application/queries/handlers/get-action.query.handler';
import { GetActionsQueryHandler } from './application/queries/handlers/get-actions.query.handler';
import { ActionController } from './infrastructure/controllers/action.controller';
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
    CharactersModule,
    CharactersRoundModule,
  ],
  controllers: [ActionController],
  providers: [
    GetActionQueryHandler,
    GetActionsQueryHandler,
    CreateActionCommandHandler,
    DeleteActionCommandHandler,
    {
      provide: 'ActionRepository',
      useClass: MongoActionRepository,
    },
  ],
})
export class ActionsModule {}
