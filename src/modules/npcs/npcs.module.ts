import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../shared/infrastructure/security/auth.module.js';
import { SharedModule } from '../shared/shared.module.js';
import { ApiNpcAdapter } from './infrastructure/api-clients/api.npc.adapter.js';

import { NPC_PORT } from './application/ports/npc.port.js';

/** The client of rmu-api-npcs (spec 054): the stat blocks of the NPC actors (spec 055). */
@Module({
  imports: [ConfigModule, AuthModule, SharedModule],
  providers: [
    {
      provide: NPC_PORT,
      useClass: ApiNpcAdapter,
    },
  ],
  exports: [NPC_PORT],
})
export class NpcsModule {}
