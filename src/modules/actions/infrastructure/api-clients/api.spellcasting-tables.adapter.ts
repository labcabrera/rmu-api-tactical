import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient } from '../../../shared/infrastructure/http/http-client.js';
import type { SpellcastingTablesPort, SpellFailureLookup } from '../../application/ports/spellcasting-tables.port.js';
import type { SpellcastingTables } from '../../domain/services/spell-casting.rules.js';
import { SPELL_FAILURE_PP, type SpellRealm, type SpellType } from '../../domain/value-objects/action-spell.vo.js';

/** Table 4-2 changes only with a new data folder: read once per process. */
@Injectable()
export class ApiSpellcastingTablesAdapter implements SpellcastingTablesPort {
  private readonly apiAttackTablesUri: string;
  private modifiers: SpellcastingTables | undefined;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiAttackTablesUri = configService.get('RMU_API_ATTACK_TABLES_URI') as string;
  }

  async findModifiers(): Promise<SpellcastingTables> {
    if (!this.modifiers) {
      const token = await this.tokenService.getToken();
      this.modifiers = await this.httpClient.get<SpellcastingTables>(`${this.apiAttackTablesUri}/spellcasting-tables/modifiers`, { token });
    }
    return this.modifiers;
  }

  async findFailure(realm: SpellRealm, type: SpellType, roll: number): Promise<SpellFailureLookup> {
    const token = await this.tokenService.getToken();
    const uri = `${this.apiAttackTablesUri}/spell-failure-tables/${realm}/${type}/${Math.trunc(roll)}`;
    const data = await this.httpClient.get<{ text?: string; pp?: string }>(uri, { token });
    const pp = SPELL_FAILURE_PP.find(each => each === data.pp) ?? 'normal';
    return { text: data.text ?? '', pp };
  }
}
