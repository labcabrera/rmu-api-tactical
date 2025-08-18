export interface SkillResponse {
  id: string;
  categoryId: string;
  bonus: string[];
  specializations: string[];
}

export interface SkillClient {
  getAllSkills(): Promise<SkillResponse[]>;

  getSkillById(skillId: string): Promise<SkillResponse>;
}
