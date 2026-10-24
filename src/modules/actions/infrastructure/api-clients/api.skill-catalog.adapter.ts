import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../../shared/infrastructure/security/token.service.js';
import { HttpClient, isUpstreamHttpError } from '../../../shared/infrastructure/http/http-client.js';
import type { SkillCatalogPort } from '../../application/ports/skill-catalog.port.js';
import {
  type CatalogSkill,
  DEFAULT_MANEUVER_PROFILE,
  type ManeuverModifierDefinition,
  type SkillManeuverProfile,
} from '../../domain/value-objects/maneuver-profile.vo.js';

interface SkillResponse {
  id: string;
  categoryId: string;
  maneuver?: Partial<SkillManeuverProfile> | null;
}

@Injectable()
export class ApiSkillCatalogAdapter implements SkillCatalogPort {
  private readonly apiCoreUri: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly httpClient: HttpClient,
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async findSkill(skillId: string): Promise<CatalogSkill | null> {
    const uri = `${this.apiCoreUri}/skills/${encodeURIComponent(skillId)}`;
    try {
      const data = await this.httpClient.get<SkillResponse>(uri, { token: await this.tokenService.getToken() });
      return { id: data.id, categoryId: data.categoryId, maneuver: { ...DEFAULT_MANEUVER_PROFILE, ...(data.maneuver ?? {}) } };
    } catch (err: unknown) {
      if (isUpstreamHttpError(err) && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async findManeuverModifiers(skillId: string): Promise<ManeuverModifierDefinition[]> {
    const uri = `${this.apiCoreUri}/maneuver-modifiers?skillId=${encodeURIComponent(skillId)}`;
    const data = await this.httpClient.get<ManeuverModifierDefinition[] | { content: ManeuverModifierDefinition[] }>(uri, {
      token: await this.tokenService.getToken(),
    });
    return Array.isArray(data) ? data : (data?.content ?? []);
  }
}
