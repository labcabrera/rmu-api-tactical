export interface SkillClient {
  getAllSkills(): Promise<any>;

  getSkillById(skillId: string): Promise<any>;
}
