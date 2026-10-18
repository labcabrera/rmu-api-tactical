import { CombatAttackArmor } from '../combat-attack-calculation';
import { ActionAttack } from '../../../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../../../domain/value-objects/attack-location.vo';
import { CombatPlugin } from '../combat-plugin';

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
 * the location hit (rolled, or called).
 */
export const CombatLocationArmorPlugin: CombatPlugin = {
  id: 'location-armor',
  group: 'resolution',
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
            ctx.armorType = armorByLocation(defense, ctx.location ?? calledShot);
          }
        },
      },
    ],
  },
};
