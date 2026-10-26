import type { ActorRound } from '../aggregates/actor-round.js';
import type { ActorRoundAttack } from '../value-objects/actor-round-attack.vo.js';
import {
  type ActiveStyleAbility,
  type ActorRoundActiveStyle,
  type ActorRoundFightingStyle,
  freeRanksBonus,
} from '../value-objects/actor-round-fighting-style.vo.js';
import type {
  CatalogFightingStyle,
  FightingStyleCatalog,
  StyleCondition,
  StyleEquipment,
} from '../value-objects/fighting-style-catalog.vo.js';

const SHIELD_SKILL = 'shield';

/** Conditions about one attack of the actor; the rest are about the actor. */
const ATTACK_CONDITIONS = ['weapon-skill', 'weapon-tag', 'weapon-category', 'two-handed', 'one-handed', 'melee', 'ranged'];

/** Conditions the game cannot check: taken as met and shown as warnings. */
const UNCHECKED_CONDITIONS = ['mounted', 'leadership', 'max-shield'];

const isWeapon = (attack: ActorRoundAttack): boolean => attack.skillId !== SHIELD_SKILL;

/** `melee-weapon@blade` matches `melee-weapon@blade` and `melee-weapon`. */
const matchesSkill = (skillId: string | null, value: string | undefined): boolean => {
  if (!skillId || !value) return false;
  return value.includes('@') ? skillId === value : skillId.split('@')[0] === value;
};

const attackMeets = (attack: ActorRoundAttack, condition: StyleCondition): boolean => {
  switch (condition.kind) {
    case 'weapon-skill':
      return matchesSkill(attack.skillId, condition.value);
    case 'weapon-tag':
      return (attack.weaponTags || []).includes(condition.value || '');
    case 'weapon-category':
      return attack.weaponCategory === condition.value;
    case 'two-handed':
      return isWeapon(attack) && attack.twoHanded;
    case 'one-handed':
      return isWeapon(attack) && !attack.twoHanded;
    case 'melee':
      return isWeapon(attack) && attack.type === 'melee';
    case 'ranged':
      return attack.type === 'ranged';
    default:
      return false;
  }
};

const weaponSlots = (actor: ActorRound): Set<string> =>
  new Set(actor.attacks.filter(attack => isWeapon(attack) && !attack.broken).map(attack => attack.attackName));

const actorMeets = (actor: ActorRound, condition: StyleCondition): boolean => {
  const slots = weaponSlots(actor);
  switch (condition.kind) {
    case 'two-weapons':
      return slots.has('mainHand') && slots.has('offHand');
    case 'single-weapon':
      return !(slots.has('mainHand') && slots.has('offHand'));
    case 'shield':
      return !!actor.defense.shield;
    case 'no-shield':
      return !actor.defense.shield;
    case 'max-armor':
      return (actor.defense.at ?? 1) <= Number(condition.value);
    case 'unarmed':
      return slots.size === 0;
    default:
      return UNCHECKED_CONDITIONS.includes(condition.kind);
  }
};

interface EquipmentResult {
  met: boolean;
  attackNames: string[] | null;
  warnings: string[];
}

/**
 * Evaluates the equipment alternatives of a style or ability: an alternative holds for an attack when every condition
 * about the attack holds for it and every condition about the actor holds. An alternative without attack conditions
 * holds for the actor as a whole (attackNames null: any attack).
 */
export const evaluateEquipment = (actor: ActorRound, equipment: StyleEquipment): EquipmentResult => {
  if (!equipment || equipment.length === 0) return { met: true, attackNames: null, warnings: [] };
  const attacks = actor.attacks.filter(attack => !attack.broken);
  const names = new Set<string>();
  let anyAttack = false;
  const warnings = new Set<string>();
  for (const alternative of equipment) {
    if (!alternative.filter(c => !ATTACK_CONDITIONS.includes(c.kind)).every(c => actorMeets(actor, c))) continue;
    alternative.filter(c => UNCHECKED_CONDITIONS.includes(c.kind)).forEach(c => warnings.add(c.kind));
    const attackConditions = alternative.filter(c => ATTACK_CONDITIONS.includes(c.kind));
    if (attackConditions.length === 0) {
      anyAttack = true;
      continue;
    }
    attacks.filter(attack => attackConditions.every(c => attackMeets(attack, c))).forEach(attack => names.add(attack.attackName));
  }
  if (anyAttack) return { met: true, attackNames: null, warnings: [...warnings] };
  return { met: names.size > 0, attackNames: [...names], warnings: names.size > 0 ? [...warnings] : [] };
};

/** The active style of the actor for its equipment, with the options it uses this round. */
export const evaluateActiveStyle = (
  actor: ActorRound,
  style: ActorRoundFightingStyle,
  catalog: FightingStyleCatalog,
  options: string[],
): ActorRoundActiveStyle => {
  const catalogStyle: CatalogFightingStyle | undefined = catalog.styles.find(s => s.id === style.styleId && s.skillId === style.skillId);
  const styleResult = evaluateEquipment(actor, catalogStyle?.equipment ?? []);
  const warnings = new Set(styleResult.warnings);
  const abilities: ActiveStyleAbility[] = style.abilities.map(selected => {
    const ability = catalog.abilities.find(a => a.id === selected.abilityId);
    const result = evaluateEquipment(actor, ability?.equipment ?? []);
    result.warnings.forEach(warning => warnings.add(warning));
    return { abilityId: selected.abilityId, times: selected.times, met: result.met, attackNames: result.attackNames };
  });
  return {
    skillId: style.skillId,
    styleId: style.styleId,
    met: !!catalogStyle && styleResult.met,
    attackNames: styleResult.attackNames,
    freeRanksBonus: freeRanksBonus(style.freeRanks),
    abilities,
    warnings: [...warnings],
    options: [...options],
  };
};
