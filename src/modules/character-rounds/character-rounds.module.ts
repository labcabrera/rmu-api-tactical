import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from 'src/modules/auth/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { GetCharacterRoundQueryHandler } from './application/queries/handlers/get-character-round.query.handler';
import { GetCharacterRoundsQueryHandler } from './application/queries/handlers/get-character-rounds.query.handler';
import { CharacterRoundController } from './infrastructure/controllers/character-round.controller';
import { CharacterRoundModel, CharacterRoundSchema } from './infrastructure/persistence/models/character-round.model';
import { MongoCharacterRoundRepository } from './infrastructure/persistence/repositories/mongo-character-model.repository';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: CharacterRoundModel.name, schema: CharacterRoundSchema }]),
    AuthModule,
    SharedModule,
    GamesModule,
  ],
  controllers: [CharacterRoundController],
  providers: [
    GetCharacterRoundQueryHandler,
    GetCharacterRoundsQueryHandler,
    {
      provide: 'CharacterRoundRepository',
      useClass: MongoCharacterRoundRepository,
    },
  ],
  exports: ['CharacterRoundRepository'],
})
export class CharactersRoundModule {}
