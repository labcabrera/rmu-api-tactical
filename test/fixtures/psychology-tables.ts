import type { PsychologyTables } from '../../src/modules/psychology/domain/value-objects/psychology-tables.vo.js';

/**
 * Psychology tables in the shape core serves them (workspace spec 022), with made-up numbers: the rulebook's stay in
 * the gitignored data of core. Required total 60, -3 per attack level, bands of 20 and 40.
 */
export const PSYCHOLOGY_TABLES: PsychologyTables = {
  frightLevels: [{ key: 'immediate-danger', level: 2 }],
  frightLevelModifiers: [{ key: 'supernatural-powerful-or-unfamiliar', level: 4 }],
  fearResults: [
    { min: 1, max: 20, severity: 'mild', result: 'balk', rallyModifier: 0 },
    { min: 21, max: 40, severity: 'moderate', result: 'retreat', rallyModifier: -15 },
    { min: 41, max: 80, severity: 'severe', result: 'routed', rallyModifier: -40 },
    { min: 81, max: null, severity: 'extreme', result: 'broken', rallyModifier: -90 },
  ],
  morale: [
    { min: null, max: 0, result: 'absolute-failure', outcome: 'refuses-hostile', moraleModifier: -5, moraleModifierDays: 10 },
    { min: 1, max: 70, result: 'failure', outcome: 'refuses' },
    { min: 71, max: 100, result: 'partial-success', outcome: 'needs-clarification' },
    { min: 101, max: 160, result: 'success', outcome: 'obeys' },
    { min: 161, max: null, result: 'absolute-success', outcome: 'inspired', moraleModifier: 4, moraleModifierDays: 20 },
  ],
  moraleUnusualEvent: { roll: 66, outcome: 'misunderstands-order' },
  rally: [
    { min: null, max: 0, result: 'absolute-failure', fearSeverityChange: 1 },
    { min: 1, max: 70, result: 'failure', fearSeverityChange: 0 },
    { min: 71, max: 100, result: 'partial-success', fearSeverityChange: -1 },
    { min: 101, max: 160, result: 'success', fearSeverityChange: -2 },
    { min: 161, max: null, result: 'absolute-success', fearSeverityChange: -3 },
  ],
  rallyUnusualEvent: { roll: 66, outcome: 'leader-fired-up', leaderFearRrBonus: 15, leaderHits: 4, durationDays: 1 },
  rallyGroupModifier: { followersPerStep: 5, modifier: -5 },
  resistance: [
    { min: 1, max: 20, result: 'mild-failure', severity: 'mild' },
    { min: 21, max: 40, result: 'moderate-failure', severity: 'moderate' },
    { min: 41, max: 80, result: 'severe-failure', severity: 'severe' },
    { min: 81, max: null, result: 'extreme-failure', severity: 'extreme' },
  ],
  resistanceRoll: {
    requiredTotal: 60,
    attackLevelMultiplier: -3,
    targetLevelMultiplier: 3,
    ownRealmBonus: 5,
    stats: { physical: 'co', fear: 'sd', channeling: 'in', essence: 'em', mentalism: 'pr' },
    fearIgnoresInjuryPenalties: true,
  },
};
