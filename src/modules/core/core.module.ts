import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';

import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CreateRaceCommandHandler } from './application/commands/handlers/create-race.command.handler';
import { CreateRealmCommandHandler } from './application/commands/handlers/create-realm.command.handler';
import { DeleteRaceCommandHandler } from './application/commands/handlers/delete-race.command.handler';
import { DeleteRealmCommandHandler } from './application/commands/handlers/delete-realm.command.handler';
import { UpdateRaceCommandHandler } from './application/commands/handlers/update-race.command.handler';
import { UpdateRealmCommandHandler } from './application/commands/handlers/update-realm.command.handler';
import { GetRaceQueryHandler } from './application/queries/handlers/get-race.query.handler';
import { GetRacesQueryHandler } from './application/queries/handlers/get-races.query.handler';
import { GetRealmQueryHandler } from './application/queries/handlers/get-realm.query.handler';
import { GetRealmsQueryHandler } from './application/queries/handlers/get-realms.query.handler';
import { ArmorTypeController } from './infrastructure/controllers/armor-type.controller';
import { CharacterSizeController } from './infrastructure/controllers/character-size.controller';
import { HealthController } from './infrastructure/controllers/health.controller';
import { RaceController } from './infrastructure/controllers/race.controller';
import { RealmController } from './infrastructure/controllers/realm.controller';
import { SkillCategoryController } from './infrastructure/controllers/skill-categories.controller';
import { SkillController } from './infrastructure/controllers/skill.controller';
import { KafkaProducerService } from './infrastructure/messaging/kafka-producer.service';
import { KafkaRaceProducerService } from './infrastructure/messaging/kafka-race-producer.service';
import { KafkaRealmProducerService } from './infrastructure/messaging/kafka-realm-producer.service';
import { RaceModel, RaceSchema } from './infrastructure/persistence/models/race-model';
import { RealmModel, RealmSchema } from './infrastructure/persistence/models/realm-model';
import { InMemoryArmorTypeRepository } from './infrastructure/persistence/repositories/in-memory-armor-type.repository';
import { InMemoryCharacterSizeRepository } from './infrastructure/persistence/repositories/in-memory-character-size.repository';
import { InMemorySkillCategoryRepository } from './infrastructure/persistence/repositories/in-memory-skill-category.repository';
import { InMemorySkillRepository } from './infrastructure/persistence/repositories/in-memory-skill.repository';
import { MongoRaceRepository } from './infrastructure/persistence/repositories/mongo-race.repository';
import { MongoRealmRepository } from './infrastructure/persistence/repositories/mongo-realm.repository';
import { RsqlParser } from './infrastructure/persistence/repositories/rsql-parser';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: RealmModel.name, schema: RealmSchema },
      { name: RaceModel.name, schema: RaceSchema },
    ]),
    AuthModule,
  ],
  controllers: [
    RealmController,
    RaceController,
    ArmorTypeController,
    CharacterSizeController,
    SkillCategoryController,
    SkillController,
    HealthController,
  ],
  providers: [
    RsqlParser,
    KafkaProducerService,
    GetRealmQueryHandler,
    GetRealmsQueryHandler,
    CreateRealmCommandHandler,
    UpdateRealmCommandHandler,
    DeleteRealmCommandHandler,
    GetRaceQueryHandler,
    GetRacesQueryHandler,
    CreateRaceCommandHandler,
    UpdateRaceCommandHandler,
    DeleteRaceCommandHandler,
    {
      provide: 'RaceRepository',
      useClass: MongoRaceRepository,
    },
    {
      provide: 'RealmRepository',
      useClass: MongoRealmRepository,
    },
    {
      provide: 'RaceEventProducer',
      useClass: KafkaRaceProducerService,
    },
    {
      provide: 'ArmorTypeRepository',
      useClass: InMemoryArmorTypeRepository,
    },
    {
      provide: 'CharacterSizeRepository',
      useClass: InMemoryCharacterSizeRepository,
    },
    {
      provide: 'SkillCategoryRepository',
      useClass: InMemorySkillCategoryRepository,
    },
    {
      provide: 'SkillRepository',
      useClass: InMemorySkillRepository,
    },
    {
      provide: 'RealmEventProducer',
      useClass: KafkaRealmProducerService,
    },
  ],
  exports: [RsqlParser, KafkaProducerService],
})
export class CoreModule {}
