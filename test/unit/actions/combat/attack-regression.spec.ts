// Regression suite of spec 003 (phase 5): the TypeScript combat plugins and resolver against what the Python
// calculator in rmu-api-attack produces (test/fixtures/attack-regression, see its README). Each case runs the real
// `prepare` (and `parry`) phase with COMBAT_PLUGIN_LIST, then the real resolver with a fake attack table that
// follows the README rule. Intended deviations (spec D2/D3) are declared per case in the fixture and asserted here
// as deviations; differences that are not declared there are pinned in UNDECLARED_DIFFERENCES below, and the rules
// spec 007 corrected in SPEC_007_DIFFERENCES.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { AttackTableLookupRequest } from '../../../../src/modules/actions/application/ports/attack-table.port.js';
import {
  COMBAT_PLUGIN_LIST,
  COMBAT_SKILL_IDS,
  CombatAttackRollResolverService,
  type CombatContext,
  CombatModifierBag,
  CombatPluginRegistryService,
  CombatProcessor,
  PARRY_PHASE,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import { ActionAttackCalculated } from '../../../../src/modules/actions/domain/value-objects/action-attack-calculated.vo.js';
import type {
  AttackType,
  CalledShot,
  Cover,
  PositionalSource,
  PositionalTarget,
  RestrictedQuarters,
} from '../../../../src/modules/actions/domain/value-objects/action-attack-modifiers.vo.js';
import { ActionAttack, AttackTableEntry } from '../../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import type { KeyValueModifier } from '../../../../src/modules/actions/domain/value-objects/key-value-modifier.vo.js';
import { ActorRoundShield } from '../../../../src/modules/actor-rounds/domain/value-objects/actor-round-shield.vo.js';
import { createCombatPluginContext } from './combat-plugin-test.factory.js';

// ---------------------------------------------------------------------------------------------------------------
// Key names
// ---------------------------------------------------------------------------------------------------------------

/**
 * Python modifier keys renamed in tactical, applied after the generic skill rename (Python's
 * `<key>-skill-<skillId>` is tactical's `<key>-skill`). Every other key is spelled the same in both. Empty on
 * purpose: `size-bonus` vs `size-difference` is not a rename but the D3 deviation, handled in DEVIATION_RULES.
 */
const KEY_RENAMES: Record<string, string> = {};

// ---------------------------------------------------------------------------------------------------------------
// Fixture shape
// ---------------------------------------------------------------------------------------------------------------

interface Mod {
  key: string;
  value: number;
}

interface CaseArmor {
  at: number | null;
  headAt: number | null;
  bodyAt: number | null;
  armsAt: number | null;
  legsAt: number | null;
}

interface CaseInput {
  attackType: AttackType;
  attackTable: string;
  attackSize: number;
  fumble: number;
  bo: number;
  bd: number;
  shield: number;
  parry: number;
  actionPoints: number;
  rangePenalty: number;
  pacePenalty: number;
  injuryPenalty: number;
  fatiguePenalty: number;
  sourceStatuses: string[];
  targetStatuses: string[];
  cover: Cover;
  restrictedQuarters: RestrictedQuarters;
  positionalSource: PositionalSource;
  positionalTarget: PositionalTarget;
  dodge: string;
  calledShot: CalledShot;
  calledShotPenalty: number;
  offHand: boolean;
  twoHandedWeapon: boolean;
  higherGround: boolean;
  disabledDB: boolean;
  disabledShield: boolean;
  disabledParry: boolean;
  sizeDifference: number;
  skills: Array<{ skillId: string; bonus: number }>;
  attackNumber: number;
  attackTargets: number;
  lethality: number;
  customBonus: number;
  armor: CaseArmor;
  roll: number;
  location: string | null;
  criticalRoll: number;
}

interface CaseCritical {
  key: string;
  type: string;
  severity: string;
  adjustment: number;
}

interface CaseExpected {
  prepareRollModifiers: Mod[];
  prepareRollTotal: number;
  rollTotal: number;
  status: string;
  fumble: boolean;
  effectiveAt: number | null;
  tableCall: { attackTable: string; size: number; roll: number; at: number | null } | null;
  tableRoll: number | null;
  tableEntry: { text: string; damage: number; criticalType: string | null; criticalSeverity: string | null } | null;
  damageBase: number | null;
  damage: number | null;
  criticalType: string | null;
  criticalSeverity: string | null;
  criticalModifiers: Mod[];
  criticalTotal: number;
  absoluteHit: number;
  criticals: CaseCritical[];
  criticalRollExample: { key: string; roll: number; adjustedRoll: number } | null;
}

interface CaseDeviation {
  decision: string;
  key: string;
  note: string;
}

interface RegressionCase {
  id: string;
  description: string;
  input: CaseInput;
  pythonAttackType: string;
  expected: CaseExpected;
  notes: string[];
  deviations: CaseDeviation[];
}

const CASES = JSON.parse(readFileSync(join(__dirname, '../../../fixtures/attack-regression/cases.json'), 'utf8')) as RegressionCase[];

// ---------------------------------------------------------------------------------------------------------------
// Rules shared by the fake table and the expectations (README of the fixtures)
// ---------------------------------------------------------------------------------------------------------------

const MAX_TABLE_ROLL = 175;
const SEVERITIES = ['Z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
/** Python's split of F..J (README); tactical's own split differs only for J (see UNDECLARED_DIFFERENCES). */
const PYTHON_CRITICAL_SPLIT: Record<string, string[]> = {
  F: ['E', 'A'],
  G: ['E', 'B'],
  H: ['E', 'C'],
  I: ['E', 'C', 'A'],
  J: ['J', 'C', 'B'],
};
const MIN_CRITICAL_ROLL = 1;
const MAX_CRITICAL_ROLL = 100;
const PACE_BY_PENALTY: Record<number, string> = { [-25]: 'walk', [-50]: 'jog', [-75]: 'run' };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** The README's fake attack table. */
const fakeTable = (rawRoll: number, at: number | null | undefined): AttackTableEntry => {
  const tableRoll = clamp(rawRoll, 1, MAX_TABLE_ROLL);
  const atUsed = at ?? 1;
  const damage = Math.floor(Math.max(0, tableRoll - 60 - atUsed) / 4);
  const score = tableRoll - atUsed;
  const severity = score < 80 ? undefined : 'ABCDEFGHIJ'[Math.min(Math.floor((score - 80) / 10), 9)];
  const type = severity ? (atUsed % 2 === 0 ? 'P' : 'S') : undefined;
  return new AttackTableEntry(`fake-${tableRoll}-${atUsed}`, damage, type, severity);
};

// ---------------------------------------------------------------------------------------------------------------
// What tactical must produce for a case
// ---------------------------------------------------------------------------------------------------------------

interface Expectation {
  /** Roll modifiers after prepare + parry, keys already in tactical's spelling. */
  rollModifiers: Mod[];
  /** Critical modifiers added while preparing (before the roll). */
  prepareCriticalModifiers: Mod[];
  /** Armour type the attack table is looked up with. */
  at: number | null;
  /** Critical split by severity (Python's by default). */
  criticalSplit: Record<string, string[]>;
  /** Sizes the critical severity is shifted by (Python: the attack size only). */
  sizeSteps: number;
  /** Sizes the damage is scaled by: none since spec 007 (Python: the attack size). */
  damageSteps: number;
}

interface Resolution {
  fumble: boolean;
  rawTotal: number;
  tableCall: { attackTable: string; size: number; roll: number; at: number | null } | null;
  tableEntry: { text: string; damage: number; criticalType: string | null; criticalSeverity: string | null } | null;
  damage: number | null;
  criticalSeverity: string | null;
  criticals: Array<{ key: string; type: string; severity: string }>;
  criticalModifiers: Mod[];
  criticalTotal: number;
  criticalRollExample: { roll: number; adjustedRoll: number } | null;
  status: string;
}

const normalizeKey = (key: string, input: CaseInput): string => {
  const skill = input.skills.find(s => key.endsWith(`-skill-${s.skillId}`));
  const renamed = skill ? key.slice(0, key.length - skill.skillId.length - 1) : key;
  return KEY_RENAMES[renamed] ?? renamed;
};

const sumOf = (modifiers: Mod[]) => modifiers.reduce((sum, modifier) => sum + modifier.value, 0);

/** Order-insensitive comparison of `{key, value}` lists. */
const asMultiset = (modifiers: Array<Mod | KeyValueModifier>) =>
  modifiers.map(modifier => `${modifier.key}=${modifier.value}`).sort((left, right) => left.localeCompare(right));

const removeKeys = (modifiers: Mod[], ...keys: string[]) => modifiers.filter(modifier => !keys.includes(modifier.key));

/** Resolution of an attack (README rules) from the prepared total and the armour type. */
const resolution = (c: RegressionCase, exp: Expectation): Resolution => {
  const input = c.input;
  const rawTotal = input.roll + sumOf(exp.rollModifiers);
  const fumble = input.fumble > 0 && input.roll <= input.fumble;
  if (fumble) {
    return {
      fumble,
      rawTotal,
      tableCall: null,
      tableEntry: null,
      damage: null,
      criticalSeverity: null,
      criticals: [],
      criticalModifiers: exp.prepareCriticalModifiers,
      criticalTotal: sumOf(exp.prepareCriticalModifiers),
      criticalRollExample: null,
      status: 'pending_fumble_roll',
    };
  }
  const entry = fakeTable(rawTotal, exp.at);
  const damage = Math.ceil(entry.damage * (1 + exp.damageSteps * 0.5));
  const baseIndex = entry.criticalSeverity ? SEVERITIES.indexOf(entry.criticalSeverity) : -1;
  const severity = baseIndex >= 0 ? SEVERITIES[clamp(baseIndex + exp.sizeSteps, 0, SEVERITIES.length - 1)] : null;
  const type = entry.criticalType ?? null;
  const criticals =
    type && severity
      ? (exp.criticalSplit[severity] ?? [severity]).map((s, index) => ({
          key: `${type}_${s}_${index + 1}`.toLowerCase(),
          type,
          severity: s,
        }))
      : [];
  const absoluteHit = rawTotal > MAX_TABLE_ROLL ? Math.ceil((rawTotal - MAX_TABLE_ROLL) / 5) : 0;
  const criticalModifiers = [...exp.prepareCriticalModifiers, ...(absoluteHit ? [{ key: 'absolute-hit', value: absoluteHit }] : [])];
  const criticalTotal = sumOf(criticalModifiers);
  return {
    fumble,
    rawTotal,
    tableCall: { attackTable: input.attackTable, size: input.attackSize, roll: rawTotal, at: exp.at },
    tableEntry: { text: entry.text, damage: entry.damage, criticalType: type, criticalSeverity: entry.criticalSeverity ?? null },
    damage,
    criticalSeverity: severity,
    criticals,
    criticalModifiers,
    criticalTotal,
    criticalRollExample: criticals.length
      ? { roll: input.criticalRoll, adjustedRoll: clamp(input.criticalRoll + criticalTotal, MIN_CRITICAL_ROLL, MAX_CRITICAL_ROLL) }
      : null,
    status: criticals.length ? 'pending_critical_roll' : 'pending_apply',
  };
};

/** The recorded Python output in the same shape, to check that the model above reproduces it. */
const pythonResolution = (c: RegressionCase): Resolution => {
  const e = c.expected;
  return {
    fumble: e.fumble,
    rawTotal: e.rollTotal,
    tableCall: e.tableCall,
    tableEntry: e.tableEntry,
    damage: e.damage,
    criticalSeverity: e.criticalSeverity,
    criticals: e.criticals.map(critical => ({ key: critical.key, type: critical.type, severity: critical.severity })),
    criticalModifiers: e.criticalModifiers,
    criticalTotal: e.criticalTotal,
    criticalRollExample: e.criticalRollExample
      ? { roll: e.criticalRollExample.roll, adjustedRoll: e.criticalRollExample.adjustedRoll }
      : null,
    status: e.status,
  };
};

// ---------------------------------------------------------------------------------------------------------------
// Intended deviations (spec D2/D3), keyed by the fixture's `deviations[].key`
// ---------------------------------------------------------------------------------------------------------------

interface PreparedAttack {
  ctx: CombatContext;
  attack: ActionAttack;
  rollModifiers: KeyValueModifier[];
  criticalModifiers: KeyValueModifier[];
}

interface DeviationRule {
  /** Turns the Python expectation into tactical's. */
  adjust: (c: RegressionCase, exp: Expectation) => void;
  /** Asserts the deviation itself on the prepared attack. */
  verify: (c: RegressionCase, prepared: PreparedAttack) => void;
}

const actionPointPenalty = (input: CaseInput) => Math.max((input.attackType === 'melee' ? 4 : 3) - input.actionPoints, 0) * -25 || 0;

const tacticalPace = (input: CaseInput): Mod[] => {
  const penalty = input.pacePenalty;
  const footwork = input.attackType !== 'ranged' ? (input.skills.find(s => s.skillId === 'footwork')?.bonus ?? 0) : 0;
  const offset = penalty < 0 && footwork > 0 ? Math.min(-penalty, footwork) : 0;
  return [{ key: 'pace-penalty', value: penalty }, ...(offset ? [{ key: 'pace-penalty-skill', value: offset }] : [])];
};

const DEVIATION_RULES: Record<string, DeviationRule> = {
  // D2: spending more action points than required gives no bonus (Python: +25 per extra point).
  'action-points': {
    adjust: (c, exp) => {
      const penalty = actionPointPenalty(c.input);
      exp.rollModifiers = [
        ...removeKeys(exp.rollModifiers, 'action-points'),
        ...(penalty ? [{ key: 'action-points', value: penalty }] : []),
      ];
    },
    verify: (c, { rollModifiers }) => {
      const python = c.expected.prepareRollModifiers.find(modifier => modifier.key === 'action-points');
      expect(python?.value).toBeGreaterThan(0);
      const tactical = rollModifiers.find(modifier => modifier.key === 'action-points');
      expect(tactical?.value ?? 0).toBe(actionPointPenalty(c.input));
      expect(tactical?.value ?? 0).toBeLessThanOrEqual(0);
    },
  },
  // D2: tactical computes the pace penalty from the declared pace (walk/jog/run) for every attack type, with the
  // footwork offset in melee and thrown attacks (spec 007); Python received the penalty already computed.
  'pace-penalty': {
    adjust: (c, exp) => {
      exp.rollModifiers = [...removeKeys(exp.rollModifiers, 'pace-penalty', 'pace-penalty-skill'), ...tacticalPace(c.input)];
    },
    verify: (c, { ctx, rollModifiers }) => {
      expect(ctx.attack!.modifiers.pace).toBe(PACE_BY_PENALTY[c.input.pacePenalty]);
      const pace = rollModifiers.filter(modifier => modifier.key.startsWith('pace-penalty'));
      expect(pace.every(modifier => modifier.source === 'pace')).toBe(true);
      expect(asMultiset(pace)).toEqual(asMultiset(tacticalPace(c.input)));
    },
  },
  // D3: the real size difference. −5 per size on the roll only for a larger attack (Python added
  // `size-bonus = diff*5` only for a smaller one), and one severity step more or less per size.
  'size-bonus': {
    adjust: (c, exp) => {
      const diff = c.input.sizeDifference;
      exp.rollModifiers = [
        ...removeKeys(exp.rollModifiers, 'size-bonus'),
        ...(diff > 0 ? [{ key: 'size-difference', value: -diff * 5 }] : []),
      ];
      exp.sizeSteps += diff;
      // The larger severity can reach J, which tactical splits its own way.
      exp.criticalSplit = TACTICAL_CRITICAL_SPLIT;
    },
    verify: (c, { rollModifiers, criticalModifiers }) => {
      const diff = c.input.sizeDifference;
      const python = c.expected.prepareRollModifiers.find(modifier => modifier.key === 'size-bonus');
      expect(python?.value ?? 0).toBe(diff < 0 ? diff * 5 : 0);
      expect(rollModifiers.find(modifier => modifier.key === 'size-bonus')).toBeUndefined();
      expect(rollModifiers.find(modifier => modifier.key === 'size-difference')?.value ?? 0).toBe(diff > 0 ? -diff * 5 : 0);
      expect(criticalModifiers).toEqual([]);
    },
  },
  // Thrown is a tactical type; Python was fed `ranged`. Thrown must compute exactly as ranged (not melee).
  'attack-type': {
    adjust: () => undefined,
    verify: (c, { attack, ctx }) => {
      expect(c.pythonAttackType).toBe('ranged');
      expect(attack.type).toBe('thrown');
      expect(ctx.sourceAttack!.type).toBe('ranged');
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Differences the fixture does not declare as deviations, confirmed in the spec 003 review. Pinned so that a
// change is noticed.
// ---------------------------------------------------------------------------------------------------------------

const TACTICAL_CRITICAL_SPLIT: Record<string, string[]> = { ...PYTHON_CRITICAL_SPLIT, J: ['E', 'C', 'B'] };

const UNDECLARED_DIFFERENCES: Record<string, { note: string; adjust: (c: RegressionCase, exp: Expectation) => void }> = {
  // The off-hand penalty (and the ambidextrous offset) is already in the OB that rmu-api-strategic computes for
  // the off-hand attack; tactical no longer adds it again.
  'melee-off-hand-rq-close-engaged': {
    note: 'off-hand penalty comes in the strategic OB',
    adjust: (_c, exp) => {
      exp.rollModifiers = removeKeys(exp.rollModifiers, 'off-hand-weapon', 'ambidextrous');
    },
  },
  'melee-off-hand-ambidextrous-two-handed': {
    note: 'off-hand penalty comes in the strategic OB',
    adjust: (_c, exp) => {
      exp.rollModifiers = removeKeys(exp.rollModifiers, 'off-hand-weapon', 'ambidextrous');
    },
  },
  // Python only matched `body`, so chest/abdomen had no armour (the fake used 1); tactical reads bodyAt.
  'location-chest-at-missing': {
    note: 'chest uses bodyAt in tactical',
    adjust: (c, exp) => {
      exp.at = c.input.armor.bodyAt;
    },
  },
  // Python split J into J, C, B; tactical uses E, C, B because there is no J critical table.
  'melee-positional-rear': {
    note: 'J critical splits into E, C, B',
    adjust: (_c, exp) => {
      exp.criticalSplit = TACTICAL_CRITICAL_SPLIT;
    },
  },
  'absolute-hit-j-critical': {
    note: 'J critical splits into E, C, B',
    adjust: (_c, exp) => {
      exp.criticalSplit = TACTICAL_CRITICAL_SPLIT;
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Rules spec 007 aligned with Core Law, where the Python calculator did not follow it.
// ---------------------------------------------------------------------------------------------------------------

const SPEC_007_DIFFERENCES: Record<string, { note: string; adjust: (c: RegressionCase, exp: Expectation) => void }> = {
  // §9.7: without a called shot a target with mixed armour is hit with its torso armour; no location is rolled.
  'location-arms-at': {
    note: 'torso armour without a called shot',
    adjust: (c, exp) => {
      exp.at = c.input.armor.bodyAt;
    },
  },
  'location-chest-at-missing': {
    note: 'torso armour without a called shot',
    adjust: (c, exp) => {
      exp.at = c.input.armor.bodyAt;
    },
  },
  // §9.7 Katas: the skill offsets the sum of the penalties once (Python offset each one).
  'multiple-attacks-targets-skill': {
    note: 'multiple attacks skill offsets the total once',
    adjust: (_c, exp) => {
      exp.rollModifiers = [
        ...removeKeys(exp.rollModifiers, 'attack-number-skill', 'attack-targets-skill'),
        { key: 'multiple-attacks-skill', value: 30 },
      ];
    },
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Cases tactical cannot express
// ---------------------------------------------------------------------------------------------------------------

const unexpressibleReason = (input: CaseInput): string | undefined => {
  const reasons: string[] = [];
  if (input.injuryPenalty) reasons.push('injury penalty');
  if (input.fatiguePenalty) reasons.push('fatigue penalty');
  input.skills
    .filter(skill => !COMBAT_SKILL_IDS.includes(skill.skillId))
    .forEach(skill => reasons.push(`skill '${skill.skillId}' (not a tactical combat skill)`));
  return reasons.length ? `tactical never produces: ${reasons.join(', ')}` : undefined;
};

// ---------------------------------------------------------------------------------------------------------------
// Running tactical
// ---------------------------------------------------------------------------------------------------------------

const processor = new CombatProcessor(new CombatPluginRegistryService(COMBAT_PLUGIN_LIST));

/** Builds the combat context from the case input and runs the prepare (and parry) phase as the handlers do. */
const prepare = async (input: CaseInput): Promise<PreparedAttack> => {
  const ranged = input.attackType !== 'melee';
  const ctx = createCombatPluginContext({
    attackType: input.attackType,
    // A medium attacker (the attack size is the weapon's only) against a target that gives the size difference.
    sourceSize: 0,
    targetSize: -input.sizeDifference,
    actionPoints: input.actionPoints,
    attackNumber: input.attackNumber,
    targetsNumber: input.attackTargets,
    calledShot: input.calledShot,
    calledShotPenalty: input.calledShotPenalty,
    pace: PACE_BY_PENALTY[input.pacePenalty],
    bo: input.bo,
    range: ranged && input.rangePenalty ? 10 : undefined,
    ranges: ranged && input.rangePenalty ? [{ from: 0, to: 100, bonus: input.rangePenalty }] : null,
    customBonus: input.customBonus,
    gameLethality: input.lethality,
    // Only the skills the prepare handler loads from the character sheet.
    sourceSkills: input.skills.filter(skill => COMBAT_SKILL_IDS.includes(skill.skillId)),
    shield: input.shield ? new ActorRoundShield(input.shield, 1, 0) : null,
    twoHanded: input.twoHandedWeapon,
    defense: { bd: input.bd, ...input.armor },
    attackSize: input.attackSize,
    fumble: input.fumble,
    modifiers: {
      disabledDB: input.disabledDB,
      disabledShield: input.disabledShield,
      disabledParry: input.disabledParry,
      offHand: input.offHand,
      higherGround: input.higherGround,
    },
    situationalModifiers: {
      cover: input.cover,
      restrictedQuarters: input.restrictedQuarters,
      positionalSource: input.positionalSource,
      positionalTarget: input.positionalTarget,
      disabledDB: input.disabledDB,
      disabledShield: input.disabledShield,
      disabledParry: input.disabledParry,
      sizeDifference: input.sizeDifference,
      higherGround: input.higherGround,
      sourceStatus: input.sourceStatuses,
      targetStatus: input.targetStatuses,
    },
  });
  ctx.sourceAttack!.attackTable = input.attackTable;

  const prepared = await processor.runPhase('prepare', ctx);
  const preparation = prepared.attackPreparation!.modifiers;
  const attack = prepared.attack!;
  const criticalAdjustment = CombatModifierBag.from(preparation.criticalModifiers).sum();
  // As the prepare handler stores it.
  attack.calculated = new ActionAttackCalculated(
    preparation.rollModifiers,
    CombatModifierBag.from(preparation.rollModifiers).sum(),
    undefined,
    criticalAdjustment || undefined,
    preparation.criticalModifiers,
  );

  if (input.parry > 0) {
    // As the declare-parry handler runs it.
    attack.modifiers.parry = input.parry;
    await processor.runPhase(PARRY_PHASE, { action: prepared.action, attack, trace: [] });
    attack.calculated.rollTotal = CombatModifierBag.from(attack.calculated.rollModifiers).sum();
  }

  return {
    ctx: prepared,
    attack,
    rollModifiers: attack.calculated.rollModifiers,
    criticalModifiers: [...(attack.calculated.criticalModifiers ?? [])],
  };
};

const resolve = async (input: CaseInput, prepared: PreparedAttack) => {
  const lookup = vi.fn((request: AttackTableLookupRequest) => Promise.resolve(fakeTable(request.roll, request.armor)));
  const resolver = new CombatAttackRollResolverService(processor, { lookup });
  const { ctx, attack } = prepared;
  await resolver.resolve({
    action: ctx.action,
    attack,
    sourceActor: ctx.sourceActor!,
    targetActor: ctx.targetActor!,
    roll: input.roll,
  });
  return lookup;
};

/** Runs the critical roll phase as the critical roll handler does, clamping the adjusted roll. */
const adjustCriticalRoll = async (prepared: PreparedAttack, criticalKey: string, roll: number): Promise<number> => {
  const { attack, ctx } = prepared;
  const result = await processor.runPhase('criticalRoll', {
    action: ctx.action,
    attack,
    criticalKey,
    criticalRoll: roll,
    location: attack.calculated?.location,
    trace: [],
  });
  return clamp(result.criticalRoll ?? roll, MIN_CRITICAL_ROLL, MAX_CRITICAL_ROLL);
};

/** What the Python calculator did where spec 007 now follows the rules: the expectation fields to check its model. */
const pythonRules = (c: RegressionCase): Partial<Expectation> => ({
  damageSteps: c.input.attackSize,
  ...(SPEC_007_DIFFERENCES[c.id]
    ? {
        at: c.expected.effectiveAt,
        rollModifiers: c.expected.prepareRollModifiers.map(modifier => ({
          key: normalizeKey(modifier.key, c.input),
          value: modifier.value,
        })),
      }
    : {}),
});

const expectationOf = (c: RegressionCase): Expectation => {
  const exp: Expectation = {
    rollModifiers: c.expected.prepareRollModifiers.map(modifier => ({ key: normalizeKey(modifier.key, c.input), value: modifier.value })),
    prepareCriticalModifiers: [],
    at: c.expected.effectiveAt,
    criticalSplit: PYTHON_CRITICAL_SPLIT,
    sizeSteps: c.input.attackSize,
    damageSteps: 0,
  };
  c.deviations.forEach(deviation => DEVIATION_RULES[deviation.key].adjust(c, exp));
  UNDECLARED_DIFFERENCES[c.id]?.adjust(c, exp);
  SPEC_007_DIFFERENCES[c.id]?.adjust(c, exp);
  return exp;
};

// ---------------------------------------------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------------------------------------------

describe('attack regression against the Python calculator (spec 003)', () => {
  it('loads every fixture case, with a rule for each declared deviation', () => {
    expect(CASES).toHaveLength(30);
    const keys = new Set(CASES.flatMap(c => c.deviations.map(deviation => deviation.key)));
    keys.forEach(key => expect(Object.keys(DEVIATION_RULES)).toContain(key));
    Object.keys(UNDECLARED_DIFFERENCES).forEach(id => expect(CASES.map(c => c.id)).toContain(id));
    Object.keys(SPEC_007_DIFFERENCES).forEach(id => expect(CASES.map(c => c.id)).toContain(id));
  });

  it('models the Python output with the fake table rule (checks the model the cases rely on)', () => {
    CASES.filter(c => !c.deviations.length && !UNDECLARED_DIFFERENCES[c.id] && !unexpressibleReason(c.input)).forEach(c => {
      const python = pythonResolution(c);
      // The model with the Python rules, before the spec 007 differences.
      const model = resolution(c, { ...expectationOf(c), ...pythonRules(c) });
      expect({ id: c.id, ...model }).toEqual({ id: c.id, ...python });
    });
  });

  describe.each(CASES.map(c => [c.id, c] as const))('%s', (_id, c) => {
    const skipReason = unexpressibleReason(c.input);
    if (skipReason) {
      it.skip(`skipped: ${skipReason}`, () => undefined);
      return;
    }

    const deviations = c.deviations.map(deviation => deviation.key);
    const undeclared = UNDECLARED_DIFFERENCES[c.id]?.note ?? SPEC_007_DIFFERENCES[c.id]?.note;
    const label = [
      deviations.length ? `deviations: ${deviations.join(', ')}` : '',
      undeclared ? `undeclared difference: ${undeclared}` : '',
    ]
      .filter(Boolean)
      .join('; ');

    it(`prepare: roll modifiers${label ? ` (${label})` : ''}`, async () => {
      const prepared = await prepare(c.input);
      const exp = expectationOf(c);

      expect(asMultiset(prepared.rollModifiers)).toEqual(asMultiset(exp.rollModifiers));
      expect(prepared.attack.calculated!.rollTotal).toBe(sumOf(exp.rollModifiers));
      expect(asMultiset(prepared.criticalModifiers)).toEqual(asMultiset(exp.prepareCriticalModifiers));
      c.deviations.forEach(deviation => DEVIATION_RULES[deviation.key].verify(c, prepared));
      if (!c.deviations.length && !undeclared) {
        expect(prepared.attack.calculated!.rollTotal).toBe(c.expected.prepareRollTotal);
      }
    });

    it(`resolver: fumble, armour, damage and criticals${label ? ` (${label})` : ''}`, async () => {
      const prepared = await prepare(c.input);
      const exp = expectationOf(c);
      const model = resolution(c, exp);
      const lookup = await resolve(c.input, prepared);
      const { attack } = prepared;
      const results = attack.results!;

      expect(attack.calculated!.rollTotal).toBe(model.rawTotal);
      expect(!!results.fumble).toBe(model.fumble);
      expect(attack.status).toBe(model.status);
      if (model.fumble) {
        expect(lookup).not.toHaveBeenCalled();
        expect(results.criticals ?? []).toEqual([]);
      } else {
        expect(lookup).toHaveBeenCalledTimes(1);
        const request = lookup.mock.calls[0][0];
        expect({ attackTable: request.attackTable, size: request.attackSize, roll: request.roll, at: request.armor ?? null }).toEqual(
          model.tableCall,
        );
        expect(results.attackTableEntry!.text).toBe(model.tableEntry!.text);
        expect(results.attackTableEntry!.damage).toBe(model.damage);
        expect(results.attackTableEntry!.criticalSeverity ?? null).toBe(model.criticalSeverity);
        expect(
          (results.criticals ?? []).map(critical => ({
            key: critical.key,
            type: critical.criticalType,
            severity: critical.criticalSeverity,
          })),
        ).toEqual(model.criticals);
      }
      expect(asMultiset(attack.calculated!.criticalModifiers ?? [])).toEqual(asMultiset(model.criticalModifiers));
      expect(attack.calculated!.criticalAdjustment ?? 0).toBe(model.criticalTotal);

      if (model.criticalRollExample) {
        const adjusted = await adjustCriticalRoll(prepared, model.criticals[0].key, model.criticalRollExample.roll);
        expect(adjusted).toBe(model.criticalRollExample.adjustedRoll);
      }

      const sameAsPython =
        sumOf(exp.rollModifiers) === c.expected.prepareRollTotal &&
        exp.at === c.expected.effectiveAt &&
        !exp.prepareCriticalModifiers.length &&
        exp.criticalSplit === PYTHON_CRITICAL_SPLIT &&
        exp.sizeSteps === c.input.attackSize &&
        (exp.damageSteps === c.input.attackSize || c.expected.damage === c.expected.damageBase);
      if (sameAsPython) {
        // Parity: no difference at all with the recorded Python output.
        expect(model).toEqual(pythonResolution(c));
      } else {
        // The difference reaches the resolution: tactical's result is not Python's.
        expect(model).not.toEqual(pythonResolution(c));
      }
    });
  });
});
