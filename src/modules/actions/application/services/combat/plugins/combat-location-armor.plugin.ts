import type { CombatAttackArmor } from '../combat-attack-calculation.js';
import type { ActorRound } from '../../../../../actor-rounds/domain/aggregates/actor-round.js';
import { ValidationError } from '../../../../../shared/domain/errors/errors.js';
import { locationOfRoll } from '../../../../domain/services/critical-location.js';
import { ActionAttack } from '../../../../domain/value-objects/action-attack.vo.js';
import { ATTACK_LOCATIONS, type AttackLocation } from '../../../../domain/value-objects/attack-location.vo.js';
import type { CombatPlugin } from '../combat-plugin.js';

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

/** The target wears armour by location (no single AT). */
const hasArmorByLocation = (target: ActorRound): boolean => target.defense.at === null || target.defense.at === undefined;

/**
 * Workspace spec 077, decision B2.1: an attack against a target with armour by location and without a called shot needs
 * the unmodified critical roll with the attack roll, because its location decides the armour type of the attack.
 */
export const needsLocationRoll = (attack: ActionAttack | undefined, target: ActorRound | undefined): boolean =>
  !!attack && !!target && !ActionAttack.isCalledShot(attack) && hasArmorByLocation(target);

/**
 * The location hit and its armour (§7.2, §9.7):
 * - a called shot hits the location called; a target without a single armour type is looked up with its armour;
 * - against a target with armour by location and no called shot, the critical is rolled with the attack (§7.2): the
 *   location of the unmodified critical roll (workspace spec 077, decision B2.2, P6) is the location hit, and the attack
 *   is looked up with its armour. Without that roll the attack cannot be resolved (`err-attack-location-roll-required`),
 *   except on a fumble, which hits nothing.
 */
export const CombatLocationArmorPlugin: CombatPlugin = {
  id: 'location-armor',
  group: 'resolution',
  rule: '§7.2, §9.7',
  hooks: {
    beforeAttackRoll: [
      {
        condition: ctx =>
          !!ctx.attack && !!ctx.targetActor && (ActionAttack.isCalledShot(ctx.attack) || hasArmorByLocation(ctx.targetActor)),
        apply: ctx => {
          const defense = ctx.targetActor!.defense;
          const calledShot = ActionAttack.isCalledShot(ctx.attack!) ? ctx.attack!.modifiers.calledShot : undefined;
          if (calledShot) {
            if (!ctx.location && ATTACK_LOCATIONS.includes(calledShot as AttackLocation)) {
              ctx.location = calledShot as AttackLocation;
            }
            if (hasArmorByLocation(ctx.targetActor!)) {
              ctx.armorType = armorByLocation(defense, ctx.location ?? calledShot);
            }
            return;
          }
          if (ctx.fumbled) return;
          if (ctx.locationRoll === undefined) {
            throw new ValidationError(
              `The target of ${ctx.attack!.attackName} wears armour by location: send the critical roll with the attack roll`,
              'err-attack-location-roll-required',
              { attackName: ctx.attack!.attackName },
            );
          }
          ctx.attack!.calculated!.locationRoll = ctx.locationRoll;
          const location = locationOfRoll(ctx.criticalLocations ?? [], ctx.locationRoll);
          if (location) {
            ctx.location = location;
            ctx.armorType = armorByLocation(defense, location);
          } else {
            ctx.armorType = defense.bodyAt;
          }
        },
      },
    ],
  },
};
