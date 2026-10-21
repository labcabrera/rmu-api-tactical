import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenService } from '../../../auth/token.service';
import { handleAxiosError } from '../../../shared/infrastructure/api-rest/axios.error.adapter';
import { SkillCatalogPort } from '../../application/ports/skill-catalog.port';
import {
  CatalogSkill,
  DEFAULT_MANEUVER_PROFILE,
  ManeuverModifierDefinition,
  SkillManeuverProfile,
} from '../../domain/value-objects/maneuver-profile.vo';

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
    configService: ConfigService,
  ) {
    this.apiCoreUri = configService.get('RMU_API_CORE_URI') as string;
  }

  async findSkill(skillId: string): Promise<CatalogSkill | null> {
    const uri = `${this.apiCoreUri}/skills/${encodeURIComponent(skillId)}`;
    try {
      const response = await axios.get<SkillResponse>(uri, { headers: await this.headers() });
      const data = response.data;
      return { id: data.id, categoryId: data.categoryId, maneuver: { ...DEFAULT_MANEUVER_PROFILE, ...(data.maneuver ?? {}) } };
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return null;
      }
      throw handleAxiosError(err, uri);
    }
  }

  async findManeuverModifiers(skillId: string): Promise<ManeuverModifierDefinition[]> {
    const uri = `${this.apiCoreUri}/maneuver-modifiers?skillId=${encodeURIComponent(skillId)}`;
    try {
      const response = await axios.get<ManeuverModifierDefinition[] | { content: ManeuverModifierDefinition[] }>(uri, {
        headers: await this.headers(),
      });
      const data = response.data;
      return Array.isArray(data) ? data : (data?.content ?? []);
    } catch (err: unknown) {
      throw handleAxiosError(err, uri);
    }
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.tokenService.getToken();
    return { Authorization: `Bearer ${token}` };
  }
}
