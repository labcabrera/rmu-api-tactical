export interface SkillCategory {
  id: string;
  bonus: string[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  { id: 'animal', bonus: ['ag', 'em'] },
  { id: 'awareness', bonus: ['in', 're'] },
  { id: 'battle-expertise', bonus: [] },
  { id: 'body-discipline', bonus: ['co', 'sd'] },
  { id: 'brawn', bonus: ['co', 'sd'] },
  { id: 'combat-expertise', bonus: [] },
  { id: 'combat-training', bonus: ['ag', 'st'] },
  { id: 'composition', bonus: ['em', 'in'] },
  { id: 'crafting', bonus: ['ag', 'me'] },
  { id: 'delving', bonus: ['em', 'in'] },
  { id: 'environmental', bonus: ['in', 'me'] },
  { id: 'gymnastic', bonus: ['ag', 'qu'] },
  { id: 'lore', bonus: ['me', 'me'] },
  { id: 'magical-expertise', bonus: [] },
  { id: 'medical', bonus: ['in', 'me'] },
  { id: 'mental-discipline', bonus: ['pr', 'sd'] },
  { id: 'movement', bonus: ['ag', 'st'] },
  { id: 'performance-art', bonus: ['em', 'pr'] },
  { id: 'power-manipulation', bonus: [] },
  { id: 'science', bonus: ['me', 're'] },
  { id: 'social', bonus: ['em', 'in'] },
  { id: 'spellcasting', bonus: [] },
  { id: 'subterfuge', bonus: ['ag', 'sd'] },
  { id: 'technical', bonus: ['in', 're'] },
  { id: 'vocation', bonus: ['em', 'me'] },
];
