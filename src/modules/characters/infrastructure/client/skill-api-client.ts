import { NotImplementedException } from '@nestjs/common';
import { SkillClient } from '../../application/ports/out/skill-client';

export class SkillApiClient implements SkillClient {
  async getAllSkills(): Promise<any[]> {
    throw new NotImplementedException();
  }

  async getSkillById(id: string): Promise<any> {
    throw new NotImplementedException();
  }
}
