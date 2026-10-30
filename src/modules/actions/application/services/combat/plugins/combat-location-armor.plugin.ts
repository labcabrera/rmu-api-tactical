import type { CombatAttackArmor } from '../combat-attack-calculation.js';
import { ActionAttack } from '../../../../domain/value-objects/action-attack.vo.js';
import type { AttackLocation } from '../../../../domain/value-objects/attack-location.vo.js';
import type { CombatPlugin } from '../combat-plugin.js';

const LOCATIONS: string[] = ['head', 'chest', 'abdomen', 'arms', 'legs'];

/** Armour of each location. Chest and abdomen are the body: the Python calculator only matched `body`. */
const armorByLocation = (armor: Omit<CombatAttackArmor, 'at'>, location: string | undefined): number | null => {
  switch (location) {
    case 'head':
      return armor.headAt;
    case 'body':
    case 'chest':
    case 'abdomen':
      return armor.bodyAt;
    case 'arms':
      return armor.armsAt;
    case 'legs':
      return armor.legsAt;
    default:
      return null;
  }
};

/**
 * A called shot hits the location called. A target without a single armour type is looked up with the armour of
 * the called location, or with its torso armour (`bodyAt`) when the shot is not called (§9.7 Called Shots): no
 * location is rolled.
 */
export const CombatLocationArmorPlugin: CombatPlugin = {
  id: 'location-armor',
  group: 'resolution',
  rule: '§9.7',
  hooks: {
    beforeAttackRoll: [
      {
        condition: ctx => !!ctx.attack && !!ctx.targetActor && (ActionAttack.isCalledShot(ctx.attack) || !ctx.targetActor.defense.at),
        apply: ctx => {
          const calledShot = ActionAttack.isCalledShot(ctx.attack!) ? ctx.attack!.modifiers.calledShot : undefined;
          if (calledShot && !ctx.location && LOCATIONS.includes(calledShot)) {
            ctx.location = calledShot as AttackLocation;
          }
          const defense = ctx.targetActor!.defense;
          if (!defense.at) {
            ctx.armorType = calledShot ? armorByLocation(defense, ctx.location ?? calledShot) : defense.bodyAt;
          }
        },
      },
    ],
  },
};
