import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from 'src/modules/auth/auth.module';
import { GamesModule } from '../games/games.module';
import { SharedModule } from '../shared/shared.module';
import { AddSkillCommandHandler } from './application/commands/handlers/add-skill.command.handler';
import { CreateCharacterCommandHandler } from './application/commands/handlers/create-character.command.handler';
import { DeleteCharacterCommandHandler } from './application/commands/handlers/delete-character.command.handler';
import { DeleteSkillCommandHandler } from './application/commands/handlers/delete-skill.command.handler';
import { UpdateCharacterCommandHandler } from './application/commands/handlers/update-character.command.handler';
import { GetCharacterQueryHandler } from './application/queries/handlers/get-character.query.handler';
import { GetCharactersQueryHandler } from './application/queries/handlers/get-characters.query.handler';
import { CharacterProcessorService } from './domain/services/character-processor.service';
import { StatProcessor } from './domain/services/character/processors/stat-processor';
import { ItemApiClient } from './infrastructure/client/item-api-client';
import { RaceApiClient } from './infrastructure/client/race-api-client';
import { SkillApiClient } from './infrastructure/client/skill-api-client';
import { SkillCategoryApiClient } from './infrastructure/client/skill-category-api-client';
import { CharacterController } from './infrastructure/controllers/characters.controller';
import { CharacterModel, CharacterSchema } from './infrastructure/persistence/models/character.model';
import { MongoCharacterRepository } from './infrastructure/persistence/repositories/mongo-character.repository';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([{ name: CharacterModel.name, schema: CharacterSchema }]),
    AuthModule,
    SharedModule,
    GamesModule,
  ],
  controllers: [CharacterController],
  providers: [
    StatProcessor,
    CharacterProcessorService,
    GetCharacterQueryHandler,
    GetCharactersQueryHandler,
    CreateCharacterCommandHandler,
    UpdateCharacterCommandHandler,
    DeleteCharacterCommandHandler,
    AddSkillCommandHandler,
    DeleteSkillCommandHandler,
    {
      provide: 'CharacterRepository',
      useClass: MongoCharacterRepository,
    },
    {
      provide: 'RaceClient',
      useClass: RaceApiClient,
    },
    {
      provide: 'SkillClient',
      useClass: SkillApiClient,
    },
    {
      provide: 'SkillCategoryClient',
      useClass: SkillCategoryApiClient,
    },
    {
      provide: 'ItemClient',
      useClass: ItemApiClient,
    },
  ],
})
export class CharactersModule {}
