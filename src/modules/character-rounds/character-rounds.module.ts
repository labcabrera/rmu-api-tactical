import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from 'src/modules/auth/auth.module';
import { CharactersModule } from '../characters/characters.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { CharacterRoundModel, CharacterRoundSchema } from './persistence/models/character-round.model';
import { MongoCharacterRoundRepository } from './persistence/repositories/mongo-character-model.repository';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: CharacterRoundModel.name, schema: CharacterRoundSchema }]),
    AuthModule,
    SharedModule,
    GamesModule,
    CharactersModule,
  ],
  controllers: [],
  providers: [
    {
      provide: 'CharacterRoundRepository',
      useClass: MongoCharacterRoundRepository,
    },
  ],
  exports: ['CharacterRoundRepository'],
})
export class CharactersRoundModule {}
