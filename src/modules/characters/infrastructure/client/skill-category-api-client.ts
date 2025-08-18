import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { TokenService } from '../../../auth/token.service';
import { SkillCategoryClient, SkillCategoryResponse } from '../../application/ports/out/skill-category-client';

@Injectable()
export class SkillCategoryApiClient implements SkillCategoryClient {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async getSkillCategoryById(categoryId: any): Promise<SkillCategoryResponse> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/v1/skill-categories/${categoryId}`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as SkillCategoryResponse;
  }

  async getAllSkillCategories(): Promise<SkillCategoryResponse[]> {
    const token = await this.tokenService.getToken();
    const apiCoreUri = this.configService.get('RMU_API_CORE_URI') as string;
    const uri = `${apiCoreUri}/v1/skill-categories`;
    const response = await axios.get(uri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as SkillCategoryResponse[];
  }
}
