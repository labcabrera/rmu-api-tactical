export interface Skill {
  id: string;
  categoryId: string;
  bonus: string[];
  specializations: string[] | null;
}

export const RMU_SKILLS: Skill[] = [
  { id: 'animal-handling', categoryId: 'animal', bonus: ['pr'], specializations: ['animal-type'] },
  { id: 'riding', categoryId: 'animal', bonus: ['pr'], specializations: ['animal-type'] },

  { id: 'perception', categoryId: 'awareness', bonus: ['sd'], specializations: null },
  { id: 'tracking', categoryId: 'awareness', bonus: ['sd'], specializations: null },

  { id: 'armor-maneuver', categoryId: 'battle-expertise', bonus: [], specializations: null },
  { id: 'mounted-combat', categoryId: 'battle-expertise', bonus: [], specializations: null },
  { id: 'protect', categoryId: 'battle-expertise', bonus: [], specializations: null },
  { id: 'restricted-quarters', categoryId: 'battle-expertise', bonus: [], specializations: null },
  { id: 'subduing', categoryId: 'battle-expertise', bonus: [], specializations: null },

  { id: 'adrenal-maneuvers', categoryId: 'body-discipline', bonus: [], specializations: null },
  { id: 'adrenal-defense', categoryId: 'body-discipline', bonus: ['ag'], specializations: null },
  { id: 'adrenal-focus', categoryId: 'body-discipline', bonus: ['sd'], specializations: null },
  { id: 'adrenal-speed', categoryId: 'body-discipline', bonus: ['qu'], specializations: null },
  { id: 'adrenal-strength', categoryId: 'body-discipline', bonus: ['st'], specializations: null },

  { id: 'body-development', categoryId: 'brawn', bonus: ['co'], specializations: null },
  { id: 'fortitude', categoryId: 'brawn', bonus: ['sd'], specializations: null },
  { id: 'weight-training', categoryId: 'brawn', bonus: ['st'], specializations: null },

  { id: 'blind-figthing', categoryId: 'combat-expertise', bonus: [], specializations: null },
  { id: 'disarm', categoryId: 'combat-expertise', bonus: [], specializations: null },
  { id: 'footwork', categoryId: 'combat-expertise', bonus: [], specializations: null },
  { id: 'multiple-attacks', categoryId: 'combat-expertise', bonus: [], specializations: null },
  { id: 'reverse-strike', categoryId: 'combat-expertise', bonus: [], specializations: null },

  { id: 'melee-weapon@blade', categoryId: 'combat-training', bonus: ['st'], specializations: null },
  { id: 'melee-weapon@chain', categoryId: 'combat-training', bonus: ['st'], specializations: null },
  {
    id: 'melee-weapon@hafted',
    categoryId: 'combat-training',
    bonus: ['st'],
    specializations: null,
  },
  {
    id: 'melee-weapon@greater-blade',
    categoryId: 'combat-training',
    bonus: ['st'],
    specializations: null,
  },
  {
    id: 'melee-weapon@greater-chain',
    categoryId: 'combat-training',
    bonus: ['st'],
    specializations: null,
  },
  {
    id: 'melee-weapon@greater-hafted',
    categoryId: 'combat-training',
    bonus: ['st'],
    specializations: null,
  },
  {
    id: 'melee-weapon@pole-arm',
    categoryId: 'combat-training',
    bonus: ['st'],
    specializations: null,
  },
  {
    id: 'melee-weapon@exotic',
    categoryId: 'combat-training',
    bonus: ['st'],
    specializations: null,
  },

  { id: 'ranged-weapon@bow', categoryId: 'combat-training', bonus: ['ag'], specializations: null },
  {
    id: 'ranged-weapon@crossbow',
    categoryId: 'combat-training',
    bonus: ['ag'],
    specializations: null,
  },
  {
    id: 'ranged-weapon@sling',
    categoryId: 'combat-training',
    bonus: ['ag'],
    specializations: null,
  },
  {
    id: 'ranged-weapon@thrown',
    categoryId: 'combat-training',
    bonus: ['ag'],
    specializations: null,
  },
  {
    id: 'ranged-weapon@exotic',
    categoryId: 'combat-training',
    bonus: ['ag'],
    specializations: null,
  },

  { id: 'shield', categoryId: 'combat-training', bonus: ['st'], specializations: null },

  { id: 'ilusion-crafting', categoryId: 'composition', bonus: ['pr'], specializations: null },
  { id: 'music-composition', categoryId: 'composition', bonus: ['pr'], specializations: null },
  { id: 'writing', categoryId: 'composition', bonus: ['re'], specializations: null },

  { id: 'culinary', categoryId: 'crafting', bonus: ['sd'], specializations: null },
  { id: 'drawing-painting', categoryId: 'crafting', bonus: ['in'], specializations: null },
  { id: 'fabric-craft', categoryId: 'crafting', bonus: ['sd'], specializations: null },
  { id: 'leathercraft', categoryId: 'crafting', bonus: ['sd'], specializations: null },
  { id: 'metalcraft', categoryId: 'crafting', bonus: ['st'], specializations: null },
  { id: 'stonecraft', categoryId: 'crafting', bonus: ['st'], specializations: null },
  { id: 'woodcraft', categoryId: 'crafting', bonus: ['sd'], specializations: null },

  { id: 'attunement', categoryId: 'delving', bonus: ['pr'], specializations: null },
  { id: 'runes', categoryId: 'delving', bonus: ['pr'], specializations: null },

  { id: 'navigation', categoryId: 'environmental', bonus: ['re'], specializations: null },
  { id: 'piloting', categoryId: 'environmental', bonus: ['ag'], specializations: null },
  { id: 'survival', categoryId: 'environmental', bonus: ['ag'], specializations: null },

  { id: 'acrobatics', categoryId: 'gymnastic', bonus: ['st'], specializations: null },
  { id: 'contortions', categoryId: 'gymnastic', bonus: ['sd'], specializations: null },
  { id: 'jumping', categoryId: 'gymnastic', bonus: ['st'], specializations: null },

  { id: 'creature-lore', categoryId: 'lore', bonus: ['re'], specializations: null },
  { id: 'historic-lore', categoryId: 'lore', bonus: ['re'], specializations: null },
  { id: 'language', categoryId: 'lore', bonus: ['re'], specializations: null },
  { id: 'materials-lore', categoryId: 'lore', bonus: ['re'], specializations: null },
  { id: 'racial-lore', categoryId: 'lore', bonus: ['re'], specializations: null },
  { id: 'region-lore', categoryId: 'lore', bonus: ['re'], specializations: null },
  { id: 'religion-lore', categoryId: 'lore', bonus: ['re'], specializations: null },
  { id: 'spell-lore', categoryId: 'lore', bonus: ['re'], specializations: null },

  { id: 'herbalism', categoryId: 'medical', bonus: ['re'], specializations: null },
  { id: 'medicine', categoryId: 'medical', bonus: ['re'], specializations: null },
  { id: 'poison-mastery', categoryId: 'medical', bonus: ['re'], specializations: null },

  {
    id: 'control-lycanthropy',
    categoryId: 'mental-discipline',
    bonus: ['sd'],
    specializations: null,
  },
  { id: 'meditation', categoryId: 'mental-discipline', bonus: ['sd'], specializations: null },
  { id: 'mental-focus', categoryId: 'mental-discipline', bonus: ['sd'], specializations: null },

  { id: 'climbing', categoryId: 'movement', bonus: ['co'], specializations: null },
  { id: 'flying', categoryId: 'movement', bonus: ['co'], specializations: null },
  { id: 'running', categoryId: 'movement', bonus: ['co'], specializations: null },
  { id: 'swimming', categoryId: 'movement', bonus: ['co'], specializations: null },

  { id: 'acting', categoryId: 'performance-art', bonus: ['me'], specializations: null },
  { id: 'music', categoryId: 'performance-art', bonus: ['me'], specializations: null },
  { id: 'state-magic', categoryId: 'performance-art', bonus: ['ag'], specializations: null },

  { id: 'channeling', categoryId: 'power-manipulation', bonus: ['sd'], specializations: null },
  { id: 'directed-spell', categoryId: 'power-manipulation', bonus: ['ag'], specializations: null },
  {
    id: 'power-development',
    categoryId: 'power-manipulation',
    bonus: ['co'],
    specializations: null,
  },
  {
    id: 'power-projection',
    categoryId: 'power-manipulation',
    bonus: ['sd'],
    specializations: null,
  },

  { id: 'architecture', categoryId: 'science', bonus: ['re'], specializations: null },
  { id: 'astronomy', categoryId: 'science', bonus: ['re'], specializations: null },
  { id: 'engineering', categoryId: 'science', bonus: ['re'], specializations: null },
  { id: 'mathematics', categoryId: 'science', bonus: ['re'], specializations: null },

  { id: 'influence', categoryId: 'social', bonus: ['pr'], specializations: null },
  { id: 'leadership', categoryId: 'social', bonus: ['pr'], specializations: null },
  { id: 'social-awareness', categoryId: 'social', bonus: ['em'], specializations: null },
  { id: 'trading', categoryId: 'social', bonus: ['em'], specializations: null },

  { id: 'magic-ritual', categoryId: 'spellcasting', bonus: ['me'], specializations: null },
  { id: 'base-spell-list', categoryId: 'spellcasting', bonus: ['me'], specializations: null },
  { id: 'open-spell-list', categoryId: 'spellcasting', bonus: ['me'], specializations: null },
  { id: 'closed-spell-list', categoryId: 'spellcasting', bonus: ['me'], specializations: null },
  { id: 'arcane-spell-list', categoryId: 'spellcasting', bonus: ['me'], specializations: null },
  { id: 'restricted-spell-list', categoryId: 'spellcasting', bonus: ['me'], specializations: null },

  { id: 'ambush', categoryId: 'subterfuge', bonus: ['in'], specializations: null },
  { id: 'concealment', categoryId: 'subterfuge', bonus: ['in'], specializations: null },
  { id: 'stalking', categoryId: 'subterfuge', bonus: ['in'], specializations: null },
  { id: 'trickery', categoryId: 'subterfuge', bonus: ['in'], specializations: null },

  { id: 'locks', categoryId: 'technical', bonus: ['ag'], specializations: null },
  { id: 'mechanics', categoryId: 'technical', bonus: ['me'], specializations: null },
  { id: 'traps', categoryId: 'technical', bonus: ['ag'], specializations: null },

  { id: 'administration', categoryId: 'vocation', bonus: ['re'], specializations: null },
  { id: 'service', categoryId: 'vocation', bonus: ['pr'], specializations: null },
  { id: 'trade', categoryId: 'vocation', bonus: ['pr'], specializations: null },
];
