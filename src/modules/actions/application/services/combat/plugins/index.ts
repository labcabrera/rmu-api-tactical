// Every combat plugin, in registration order: the order inside a phase when priorities are equal, and so the order
// of the breakdown. The prepare plugins follow the order of the Python calculator. A new rule only needs its file
// here and an entry in COMBAT_PLUGIN_LIST.
import type { CombatPlugin } from '../combat-plugin.js';
import { CombatAbsoluteHitPlugin } from './combat-absolute-hit.plugin.js';
import { CombatActionPointsPlugin } from './combat-action-points.plugin.js';
import { CombatAttackSizePlugin } from './combat-attack-size.plugin.js';
import { CombatBreakagePlugin } from './combat-breakage.plugin.js';
import { CombatCalledShotPlugin } from './combat-called-shot.plugin.js';
import { CombatCoverPlugin } from './combat-cover.plugin.js';
import { CombatCriticalAdjustmentPlugin } from './combat-critical-adjustment.plugin.js';
import { CombatCriticalExpansionPlugin } from './combat-critical-expansion.plugin.js';
import { CombatActorPenaltiesPlugin } from './combat-actor-penalties.plugin.js';
import { CombatCustomBonusPlugin } from './combat-custom-bonus.plugin.js';
import { CombatDefensiveBonusPlugin } from './combat-defensive-bonus.plugin.js';
import { CombatDodgePlugin } from './combat-dodge.plugin.js';
import { CombatFlatfootedTargetPlugin } from './combat-flatfooted-target.plugin.js';
import { CombatFoilerPlugin } from './combat-foiler.plugin.js';
import { CombatFightingStyleSourcePlugin, CombatFightingStyleTargetPlugin } from './combat-fighting-style.plugin.js';
import { CombatGameLethalityPlugin } from './combat-game-lethality.plugin.js';
import { CombatHigherGroundPlugin } from './combat-higher-ground.plugin.js';
import { CombatLocationArmorPlugin } from './combat-location-armor.plugin.js';
import { CombatMultipleAttacksPlugin } from './combat-multiple-attacks.plugin.js';
import { CombatNonViolentPlugin } from './combat-non-violent.plugin.js';
import { CombatOffensiveBonusPlugin } from './combat-offensive-bonus.plugin.js';
import { CombatPacePlugin } from './combat-pace.plugin.js';
import { CombatParryPlugin } from './combat-parry.plugin.js';
import { CombatPressingAdvantagePlugin } from './combat-pressing-advantage.plugin.js';
import { CombatPositionalSourcePlugin } from './combat-positional-source.plugin.js';
import { CombatPositionalTargetPlugin } from './combat-positional-target.plugin.js';
import { CombatProneSourcePlugin } from './combat-prone-source.plugin.js';
import { CombatProneTargetPlugin } from './combat-prone-target.plugin.js';
import { CombatRangeInMeleePlugin } from './combat-range-in-melee.plugin.js';
import { CombatRangePlugin } from './combat-range.plugin.js';
import { CombatRestrictedQuartersPlugin } from './combat-restricted-quarters.plugin.js';
import { CombatShieldPlugin } from './combat-shield.plugin.js';
import { CombatSizeDifferencePlugin } from './combat-size-difference.plugin.js';
import { CombatStunPlugin } from './combat-stun.plugin.js';
import { CombatSurprisedPlugin } from './combat-surprised.plugin.js';
import { CombatTextEffectsPlugin } from './combat-text-effects.plugin.js';
import { CombatTwoHandedWeaponPlugin } from './combat-two-handed-weapon.plugin.js';

export const COMBAT_PLUGIN_LIST: CombatPlugin[] = [
  // prepare
  CombatOffensiveBonusPlugin,
  CombatTwoHandedWeaponPlugin,
  CombatActorPenaltiesPlugin,
  CombatPacePlugin,
  CombatPressingAdvantagePlugin,
  CombatNonViolentPlugin,
  CombatRangePlugin,
  CombatActionPointsPlugin,
  CombatDefensiveBonusPlugin,
  CombatShieldPlugin,
  CombatDodgePlugin,
  // parry
  CombatParryPlugin,
  CombatFightingStyleTargetPlugin,
  // prepare
  CombatRestrictedQuartersPlugin,
  CombatProneSourcePlugin,
  CombatTextEffectsPlugin,
  CombatStunPlugin,
  CombatSurprisedPlugin,
  CombatFlatfootedTargetPlugin,
  CombatProneTargetPlugin,
  CombatPositionalSourcePlugin,
  CombatPositionalTargetPlugin,
  CombatCoverPlugin,
  CombatRangeInMeleePlugin,
  CombatSizeDifferencePlugin,
  CombatFightingStyleSourcePlugin,
  CombatCalledShotPlugin,
  CombatMultipleAttacksPlugin,
  CombatHigherGroundPlugin,
  CombatGameLethalityPlugin,
  CombatCustomBonusPlugin,
  CombatFoilerPlugin,
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

export * from './combat-actor-penalties.plugin.js';
export * from './combat-non-violent.plugin.js';
export * from './combat-absolute-hit.plugin.js';
export * from './combat-action-points.plugin.js';
export * from './combat-attack-size.plugin.js';
export * from './combat-breakage.plugin.js';
export * from './combat-called-shot.plugin.js';
export * from './combat-cover.plugin.js';
export * from './combat-critical-adjustment.plugin.js';
export * from './combat-critical-expansion.plugin.js';
export * from './combat-custom-bonus.plugin.js';
export * from './combat-defensive-bonus.plugin.js';
export * from './combat-dodge.plugin.js';
export * from './combat-flatfooted-target.plugin.js';
export * from './combat-fighting-style.plugin.js';
export * from './combat-foiler.plugin.js';
export * from './combat-game-lethality.plugin.js';
export * from './combat-higher-ground.plugin.js';
export * from './combat-location-armor.plugin.js';
export * from './combat-multiple-attacks.plugin.js';
export * from './combat-offensive-bonus.plugin.js';
export * from './combat-pace.plugin.js';
export * from './combat-parry.plugin.js';
export * from './combat-positional-source.plugin.js';
export * from './combat-pressing-advantage.plugin.js';
export * from './combat-positional-target.plugin.js';
export * from './combat-prone-source.plugin.js';
export * from './combat-prone-target.plugin.js';
export * from './combat-range-in-melee.plugin.js';
export * from './combat-range.plugin.js';
export * from './combat-restricted-quarters.plugin.js';
export * from './combat-shield.plugin.js';
export * from './combat-size-difference.plugin.js';
export * from './combat-stun.plugin.js';
export * from './combat-surprised.plugin.js';
export * from './combat-two-handed-weapon.plugin.js';
