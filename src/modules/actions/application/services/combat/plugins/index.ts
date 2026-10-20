// Every combat plugin, in registration order: the order inside a phase when priorities are equal, and so the order
// of the breakdown. The prepare plugins follow the order of the Python calculator. A new rule only needs its file
// here and an entry in COMBAT_PLUGIN_LIST.
import { CombatPlugin } from '../combat-plugin';
import { CombatAbsoluteHitPlugin } from './combat-absolute-hit.plugin';
import { CombatActionPointsPlugin } from './combat-action-points.plugin';
import { CombatAttackSizePlugin } from './combat-attack-size.plugin';
import { CombatBreakagePlugin } from './combat-breakage.plugin';
import { CombatCalledShotPlugin } from './combat-called-shot.plugin';
import { CombatCoverPlugin } from './combat-cover.plugin';
import { CombatCriticalAdjustmentPlugin } from './combat-critical-adjustment.plugin';
import { CombatCriticalExpansionPlugin } from './combat-critical-expansion.plugin';
import { CombatActorPenaltiesPlugin } from './combat-actor-penalties.plugin';
import { CombatCustomBonusPlugin } from './combat-custom-bonus.plugin';
import { CombatDefensiveBonusPlugin } from './combat-defensive-bonus.plugin';
import { CombatDodgePlugin } from './combat-dodge.plugin';
import { CombatFlatfootedTargetPlugin } from './combat-flatfooted-target.plugin';
import { CombatGameLethalityPlugin } from './combat-game-lethality.plugin';
import { CombatHigherGroundPlugin } from './combat-higher-ground.plugin';
import { CombatLocationArmorPlugin } from './combat-location-armor.plugin';
import { CombatMultipleAttacksPlugin } from './combat-multiple-attacks.plugin';
import { CombatOffensiveBonusPlugin } from './combat-offensive-bonus.plugin';
import { CombatPacePlugin } from './combat-pace.plugin';
import { CombatParryPlugin } from './combat-parry.plugin';
import { CombatPositionalSourcePlugin } from './combat-positional-source.plugin';
import { CombatPositionalTargetPlugin } from './combat-positional-target.plugin';
import { CombatProneSourcePlugin } from './combat-prone-source.plugin';
import { CombatProneTargetPlugin } from './combat-prone-target.plugin';
import { CombatRangeInMeleePlugin } from './combat-range-in-melee.plugin';
import { CombatRangePlugin } from './combat-range.plugin';
import { CombatRestrictedQuartersPlugin } from './combat-restricted-quarters.plugin';
import { CombatShieldPlugin } from './combat-shield.plugin';
import { CombatSizeDifferencePlugin } from './combat-size-difference.plugin';
import { CombatStunPlugin } from './combat-stun.plugin';
import { CombatSurprisedPlugin } from './combat-surprised.plugin';
import { CombatTwoHandedWeaponPlugin } from './combat-two-handed-weapon.plugin';

export const COMBAT_PLUGIN_LIST: CombatPlugin[] = [
  // prepare
  CombatOffensiveBonusPlugin,
  CombatTwoHandedWeaponPlugin,
  CombatActorPenaltiesPlugin,
  CombatPacePlugin,
  CombatRangePlugin,
  CombatActionPointsPlugin,
  CombatDefensiveBonusPlugin,
  CombatShieldPlugin,
  CombatDodgePlugin,
  // parry
  CombatParryPlugin,
  // prepare
  CombatRestrictedQuartersPlugin,
  CombatProneSourcePlugin,
  CombatStunPlugin,
  CombatSurprisedPlugin,
  CombatFlatfootedTargetPlugin,
  CombatProneTargetPlugin,
  CombatPositionalSourcePlugin,
  CombatPositionalTargetPlugin,
  CombatCoverPlugin,
  CombatRangeInMeleePlugin,
  CombatSizeDifferencePlugin,
  CombatCalledShotPlugin,
  CombatMultipleAttacksPlugin,
  CombatHigherGroundPlugin,
  CombatGameLethalityPlugin,
  CombatCustomBonusPlugin,
  // beforeAttackRoll
  CombatLocationArmorPlugin,
  CombatBreakagePlugin,
  // afterAttackRoll
  CombatAbsoluteHitPlugin,
  CombatAttackSizePlugin,
  CombatCriticalExpansionPlugin,
  // prepare (ambush) and criticalRoll
  CombatCriticalAdjustmentPlugin,
];

export * from './combat-actor-penalties.plugin';
export * from './combat-absolute-hit.plugin';
export * from './combat-action-points.plugin';
export * from './combat-attack-size.plugin';
export * from './combat-breakage.plugin';
export * from './combat-called-shot.plugin';
export * from './combat-cover.plugin';
export * from './combat-critical-adjustment.plugin';
export * from './combat-critical-expansion.plugin';
export * from './combat-custom-bonus.plugin';
export * from './combat-defensive-bonus.plugin';
export * from './combat-dodge.plugin';
export * from './combat-flatfooted-target.plugin';
export * from './combat-game-lethality.plugin';
export * from './combat-higher-ground.plugin';
export * from './combat-location-armor.plugin';
export * from './combat-multiple-attacks.plugin';
export * from './combat-offensive-bonus.plugin';
export * from './combat-pace.plugin';
export * from './combat-parry.plugin';
export * from './combat-positional-source.plugin';
export * from './combat-positional-target.plugin';
export * from './combat-prone-source.plugin';
export * from './combat-prone-target.plugin';
export * from './combat-range-in-melee.plugin';
export * from './combat-range.plugin';
export * from './combat-restricted-quarters.plugin';
export * from './combat-shield.plugin';
export * from './combat-size-difference.plugin';
export * from './combat-stun.plugin';
export * from './combat-surprised.plugin';
export * from './combat-two-handed-weapon.plugin';
