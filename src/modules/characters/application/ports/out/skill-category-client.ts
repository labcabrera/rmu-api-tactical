export interface SkillCategoryResponse {
  id: string;
  bonus: string[];
}

export interface SkillCategoryClient {
  getSkillCategoryById(categoryId: any): Promise<SkillCategoryResponse>;

  getAllSkillCategories(): Promise<SkillCategoryResponse[]>;
}
