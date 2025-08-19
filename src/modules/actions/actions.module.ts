import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from 'src/modules/auth/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { ActionController } from './infrastructure/controllers/action.controller';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    //MongooseModule.forFeature([{ name: CharacterModel.name, schema: CharacterSchema }]),
    AuthModule,
    SharedModule,
    GamesModule,
  ],
  controllers: [ActionController],
  providers: [],
})
export class ActionsModule {}
