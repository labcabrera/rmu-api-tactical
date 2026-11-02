/** A known spell of the caster's spellbook, as strategic returns it (spec 029). */
export interface CharacterKnownSpell {
  spell: {
    id: string;
    name: string;
    level: number;
    modifiers?: {
      typeCode?: string | null;
      type?: string | null;
      subtype?: string | null;
      instant?: boolean | null;
      powerPoints?: number | null;
      range?: Record<string, unknown> | null;
      area?: Record<string, unknown> | null;
      duration?: Record<string, unknown> | null;
      resistance?: { kind: string; modifier: number | null; scaling: string | null } | null;
    } | null;
    effects?: Record<string, unknown>[] | null;
  };
  powerPoints: number;
}

export interface CharacterKnownSpellList {
  skillId: string;
  code: string;
  spellListId: string | null;
  name: string | null;
  type: string | null;
  realms: string[];
  ranks: number;
  listTypeModifier: number;
  spells: CharacterKnownSpell[];
}

/** What a caster brings to a Spellcasting Roll: `GET /characters/:id/spellcasting` of strategic (spec 030). */
export interface CharacterSpellcasting {
  characterId: string;
  realms: string[];
  realmStatBonus: number;
  level: number;
  power: { max: number; current: number } | null;
  lists: CharacterKnownSpellList[];
}

/** Magic of a strategic character, with the service account (spec 029 lets it spend power points). */
export interface CharacterMagicPort {
  /** Undefined when strategic has no such character (an NPC actor). */
  findSpellcasting(characterId: string): Promise<CharacterSpellcasting | undefined>;
  spendPower(characterId: string, amount: number): Promise<void>;
}

export const CHARACTER_MAGIC_PORT = Symbol('CharacterMagicPort');
