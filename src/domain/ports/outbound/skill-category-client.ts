export interface SkillCategoryClient {
  getSkillCategoryById(categoryId: string): Promise<any>;
}
