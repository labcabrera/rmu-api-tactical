import type { CatalogSkill, ManeuverModifierDefinition } from '../../domain/value-objects/maneuver-profile.vo';

/** Skills and their maneuver catalog, read from core. */
export interface SkillCatalogPort {
  /** The skill with its effective maneuver profile; null when core does not know it. */
  findSkill(skillId: string): Promise<CatalogSkill | null>;

  /** Skill-specific maneuver modifiers that apply to the skill (its own and its category's). */
  findManeuverModifiers(skillId: string): Promise<ManeuverModifierDefinition[]>;
}

export const SKILL_CATALOG_PORT = Symbol('SkillCatalogPort');
