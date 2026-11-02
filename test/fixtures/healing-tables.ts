import type { HealingCombatRules } from '../../src/modules/actor-rounds/domain/value-objects/treatment-difficulty.vo.js';

/**
 * Combat rules of core's healing tables (workspace spec 068, §1) with made-up numbers: the rulebook's stay in the
 * gitignored data of core. Bands of the Medicine total for the cauterization, short durations and an invented
 * surgery requirement.
 */
export const HEALING_COMBAT_RULES: HealingCombatRules = {
  treatmentDurations: [
    { procedure: 'pressure', rounds: 2, perBleeding: true },
    { procedure: 'stitches', rounds: 3, perBleeding: true },
    { procedure: 'tourniquet', rounds: 2, perBleeding: false },
    { procedure: 'cauterize', rounds: 1, perBleeding: false },
    { procedure: 'dress', rounds: 2, perBleeding: false },
    { procedure: 'splint', rounds: 3, perBleeding: false },
    { procedure: 'cast', rounds: 3, perBleeding: false },
    { procedure: 'salve', rounds: 2, perBleeding: false },
    { procedure: 'surgery', rounds: null, perBleeding: false },
    { procedure: 'magic', rounds: 1, perBleeding: false },
    { procedure: 'stabilize', rounds: 1, perBleeding: false },
  ],
  cauterization: [
    { min: null, max: 0, result: 'absolute-failure', bleeding: 'unchanged', heatSeverity: 'D', hitsDice: 4 },
    { min: 1, max: 75, result: 'failure', bleeding: 'halved', heatSeverity: 'C', hitsDice: 3 },
    { min: 76, max: 100, result: 'partial-success', bleeding: 'stopped', heatSeverity: 'B', hitsDice: 2 },
    { min: 101, max: 175, result: 'success', bleeding: 'stopped', heatSeverity: 'A', hitsDice: 1 },
    { min: 176, max: null, result: 'absolute-success', bleeding: 'stopped', heatSeverity: null, hitsDice: 0 },
  ],
  cauterizationUnusualRoll: 66,
  surgeryRequired: [{ injuryType: 'organ', severity: 'severe' }],
  treatmentLimits: {
    splint: { leg: { pace: 'jog' }, arm: { limbUnusable: true } },
    cast: { leg: { pace: 'creep', cane: 'walk', crutches: 'jog' }, maneuverPenaltyFactor: 0.5 },
  },
  tourniquet: { loosenEveryRounds: 3, graceRounds: 1 },
  stabilize: { difficulty: 'm', successRounds: 1, absoluteRounds: 2 },
  salveModifier: { min: -15, max: 15 },
  combatItemAp: 2,
};
