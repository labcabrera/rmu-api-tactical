/** Skills whose specializations are the fighting styles (workspace spec 032). */
export const FIGHTING_STYLE_SKILLS = ['battle-styles', 'combat-styles', 'discipline-styles'];

/** Unallocated ranks give +2 OB each, at most +10, while fighting in the style (Character Companion §4.1). */
export const FREE_RANK_BONUS = 2;
export const MAX_FREE_RANKS_BONUS = 10;

/** Abilities of a style the player may use or not each round, declared with the style. */
export const OPTIONAL_STYLE_ABILITIES = ['killing-strike'];

export interface ActorRoundStyleAbility {
  abilityId: string;
  times: number;
}

/** A fighting style of the character, copied from its sheet: ranks and the abilities they were allocated to. */
export interface ActorRoundFightingStyle {
  skillId: string;
  styleId: string;
  ranks: number;
  freeRanks: number;
  abilities: ActorRoundStyleAbility[];
}

/** An ability of the active style, with the attacks it works with. */
export interface ActiveStyleAbility extends ActorRoundStyleAbility {
  /** The equipment it needs is there. */
  met: boolean;
  /** Attacks it works with; null when it does not depend on the weapon. */
  attackNames: string[] | null;
}

/**
 * The style the actor fights with (spec 032, decision 7): only one per round, kept from round to round until the
 * player changes it. Its requirements are checked against the actor's equipment when it is declared.
 */
export interface ActorRoundActiveStyle {
  skillId: string;
  styleId: string;
  /** The equipment of the style is there: otherwise it gives nothing. */
  met: boolean;
  /** Attacks the style works with; null when it does not depend on the weapon. */
  attackNames: string[] | null;
  /** OB of the free ranks (+2 each, at most +10). */
  freeRanksBonus: number;
  abilities: ActiveStyleAbility[];
  /** Requirements the game cannot check (mounted, leadership...): taken as met, shown as warnings. */
  warnings: string[];
  /** Optional abilities used this round (OPTIONAL_STYLE_ABILITIES). */
  options: string[];
}

export const freeRanksBonus = (freeRanks: number): number => Math.min(MAX_FREE_RANKS_BONUS, FREE_RANK_BONUS * Math.max(0, freeRanks));

/** The ability of the active style is selected, its equipment is there and, given an attack, it works with it. */
export const activeStyleAbility = (
  style: ActorRoundActiveStyle | null | undefined,
  abilityId: string,
  attackName?: string,
): ActiveStyleAbility | undefined => {
  if (!style?.met) return undefined;
  const ability = style.abilities.find(each => each.abilityId === abilityId);
  if (!ability?.met) return undefined;
  if (attackName === undefined) return ability;
  const styleWorks = style.attackNames === null || style.attackNames.includes(attackName);
  const abilityWorks = ability.attackNames === null || ability.attackNames.includes(attackName);
  return styleWorks && abilityWorks ? ability : undefined;
};

/** The active style works with the attack. */
export const activeStyleWorksWith = (style: ActorRoundActiveStyle | null | undefined, attackName: string): boolean =>
  !!style?.met && (style.attackNames === null || style.attackNames.includes(attackName));
