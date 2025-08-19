import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { SkillClient, SkillResponse } from '../../application/ports/out/skill-client';

@Injectable()
export class SkillApiClient implements SkillClient {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async getAllSkills(): Promise<SkillResponse[]> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skills`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as SkillResponse[];
  }

  async getSkillById(skillId: string): Promise<SkillResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/skills/${skillId}`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as SkillResponse;
  }
}
