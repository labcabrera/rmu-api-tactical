import { describe, expect, it } from 'vitest';
import { Action, type ActionProps } from '../../../src/modules/actions/domain/aggregates/action.js';
import type { ActionMedical } from '../../../src/modules/actions/domain/value-objects/action-medical.vo.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { MedicalAbortService } from '../../../src/modules/actor-rounds/application/services/medical-abort.service.js';
import { InjuryTreatmentRules, type MedicalOutcome } from '../../../src/modules/actor-rounds/domain/services/injury-treatment.js';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import {
  buildInjury,
  type Injury,
  type MedicalResult,
  type TreatmentInProgress,
} from '../../../src/modules/actor-rounds/domain/value-objects/injury.vo.js';
import { temporaryModifierLines } from '../../../src/modules/actor-rounds/domain/value-objects/temporary-modifier.vo.js';
import { HEALING_COMBAT_RULES } from '../../fixtures/healing-tables.js';
import { effect, load } from './actor-round-test.factory.js';

// Made-up wounds and rules (workspace spec 068): never the rows of the book.
const wound = (id: string, bleeding: number, overrides: Partial<Injury> = {}): Injury => ({
  ...buildInjury({ id, type: 'cut-burn', location: 'arm', penalty: -20, bleeding, source: { kind: 'critical' } }),
  ...overrides,
});

const outcome = (result: MedicalResult): MedicalOutcome => ({ result, recoveryModifier: 0, injuryPenalty: 0 });
const healer = { name: 'Elrond', bonus: 50 };

const progress = (procedure: TreatmentInProgress['procedure'], result: MedicalResult, actionId = 'medical-1'): TreatmentInProgress => ({
  actionId,
  healerActorId: 'elrond',
  procedure,
  startedRound: 1,
  rounds: 2,
  roll: 80,
  total: 130,
  result,
  healer,
  difficulty: 0,
});

describe('treatment durations (workspace spec 068, decision 2)', () => {
  it('takes the rounds of core, per point of bleeding when the row says so, at least 1', () => {
    expect(InjuryTreatmentRules.durationRounds('pressure', wound('w', 3), HEALING_COMBAT_RULES)).toBe(6);
    expect(InjuryTreatmentRules.durationRounds('pressure', wound('w', 0), HEALING_COMBAT_RULES)).toBe(2);
    expect(InjuryTreatmentRules.durationRounds('dress', wound('w', 3), HEALING_COMBAT_RULES)).toBe(2);
    // Without a row (an older core) a procedure takes one round
    expect(InjuryTreatmentRules.durationRounds('dress', wound('w', 3), { ...HEALING_COMBAT_RULES, treatmentDurations: [] })).toBe(1);
  });

  it('refuses surgery in combat and a procedure other than surgery or magic on an injury that needs it', () => {
    expect(() => InjuryTreatmentRules.durationRounds('surgery', wound('w', 0), HEALING_COMBAT_RULES)).toThrow(
      expect.objectContaining({ code: 'err-treatment-not-in-combat' }),
    );
    const organ = wound('w', 2, { type: 'organ', severity: 'severe' });
    expect(() => InjuryTreatmentRules.validate('dress', organ, HEALING_COMBAT_RULES)).toThrow(
      expect.objectContaining({ code: 'err-treatment-surgery-required' }),
    );
    expect(() => InjuryTreatmentRules.validate('magic', organ, HEALING_COMBAT_RULES)).not.toThrow();
  });
});

describe('treatments in progress (workspace spec 068, decisions 3 and 4)', () => {
  it('stops the bleeding of a successful pressure from the first round, and the upkeep does not take it', () => {
    const patient = load({ injuries: [wound('cut', 3)] });
    patient.startTreatment('cut', progress('pressure', 'success'));
    expect(patient.injuries[0].bleedingControl).toBe('pressure');
    expect(patient.getBleeding()).toBe(0);
    patient.applyUpkeep();
    expect(patient.hp.current).toBe(50);
  });

  it('a failed pressure leaves the wound bleeding', () => {
    const patient = load({ injuries: [wound('cut', 3)] });
    patient.startTreatment('cut', progress('pressure', 'failure'));
    expect(patient.getBleeding()).toBe(3);
  });

  it('refuses a second treatment in progress on the same injury', () => {
    const patient = load({ injuries: [wound('cut', 3)] });
    patient.startTreatment('cut', progress('pressure', 'success'));
    expect(() => patient.startTreatment('cut', progress('dress', 'success', 'medical-2'))).toThrow(
      expect.objectContaining({ code: 'err-treatment-in-progress' }),
    );
  });

  it('interrupted pressure bleeds again with an alert; any other procedure loses its progress', () => {
    const patient = load({ injuries: [wound('cut', 3), wound('graze', 0)] });
    patient.startTreatment('cut', progress('pressure', 'success'));
    patient.startTreatment('graze', progress('dress', 'success', 'medical-2'));
    patient.abortTreatment('medical-1');
    patient.abortTreatment('medical-2');
    expect(patient.getBleeding()).toBe(3);
    expect(patient.injuries.map(injury => injury.treatmentInProgress ?? null)).toEqual([null, null]);
    expect(patient.alerts.map(alert => alert.type)).toEqual(['wound-reopened']);
    expect(patient.injuries[1].treatments).toEqual([]);
  });

  it('completes the treatment with the roll of its first round, and a note when it is after the combat', () => {
    const patient = load({ injuries: [wound('cut', 2)] });
    patient.startTreatment('cut', progress('stitches', 'success'));
    const done = patient.completeTreatment('medical-1', { rules: HEALING_COMBAT_RULES, note: 'completed-after-combat' });
    expect(done!.treatment).toMatchObject({ procedure: 'stitches', result: 'success', total: 130, note: 'completed-after-combat' });
    expect(patient.injuries[0]).toMatchObject({ bleeding: 0, reopenOn: 'failed-roll', reopenBleeding: 2 });
    expect(patient.injuries[0].treatmentInProgress).toBeNull();
  });

  it('aborts the medical actions on the patient of each round asked, and marks them aborted', async () => {
    const patient = load({ injuries: [wound('cut', 3)] });
    patient.startTreatment('cut', progress('pressure', 'success', 'origin'));
    const medical = { patientActorId: 'actor-1', originActionId: 'origin', state: 'in-progress' } as ActionMedical;
    const action = Action.fromProps({ ...actionProps('medical'), medical });
    const aborted = await new MedicalAbortService({} as ActorRoundRepository).abort([action], { known: [patient] });
    expect(aborted).toEqual([action]);
    expect(action.medical!.state).toBe('aborted');
    expect(patient.getBleeding()).toBe(3);
  });
});

describe('reopening and limits (workspace spec 068, decisions 5 and 10)', () => {
  it('a completed pressure reopens with exertion, and stitches with a failed roll, with an alert', () => {
    const patient = load({ injuries: [wound('cut', 2), wound('gash', 4)] });
    patient.treatInjury(
      'cut',
      'pressure',
      outcome('success'),
      { healer, difficulty: 0, roll: 90, total: 140 },
      { rules: HEALING_COMBAT_RULES },
    );
    patient.treatInjury(
      'gash',
      'stitches',
      outcome('success'),
      { healer, difficulty: 0, roll: 90, total: 140 },
      { rules: HEALING_COMBAT_RULES },
    );
    expect(patient.exertionInjuries().map(injury => injury.id)).toEqual(['cut']);
    expect(patient.reopenWounds('failed-roll')).toEqual(['gash']);
    expect(patient.injuries[1]).toMatchObject({ bleeding: 4, reopenOn: null });
    expect(patient.alerts.at(-1)!.modifiers!.map(modifier => modifier.key)).toEqual(['injuryId', 'reason', 'bleeding']);
    expect(patient.reopenWounds('exertion')).toEqual(['cut']);
    expect(patient.getBleeding()).toBe(6);
  });

  it('a splinted leg limits the pace, a splinted arm is useless and a cast halves its maneuver penalty', () => {
    const leg = wound('leg', 0, { type: 'bone', location: 'leg' });
    const arm = wound('arm', 0, { type: 'bone', location: 'arm' });
    const cast = wound('cast', 0, { type: 'bone', location: 'leg', penalty: -30 });
    const patient = load({ injuries: [leg, arm, cast] });
    const success = { healer, difficulty: 0, roll: 90, total: 140 };
    patient.treatInjury('leg', 'splint', outcome('success'), success, { rules: HEALING_COMBAT_RULES });
    patient.treatInjury('arm', 'splint', outcome('success'), success, { rules: HEALING_COMBAT_RULES });
    patient.treatInjury('cast', 'cast', outcome('success'), success, { rules: HEALING_COMBAT_RULES, castSupport: 'crutches' });
    // Made-up limits: a splinted leg jogs, a cast leg with crutches jogs too, a cast creeps without support
    expect(patient.injuryPaceLimit()).toBe('jog');
    expect(patient.unusableLimbInjuries().map(injury => injury.id)).toEqual(['arm']);
    expect(patient.injuries[2].limits).toMatchObject({ pace: 'jog', maneuverPenaltyFactor: 0.5 });
    expect(patient.injuries[2].treatments[0].castSupport).toBe('crutches');
  });

  it('a tourniquet asks to be loosened, then flags the limb for loss; loosening bleeds this round and tightens again', () => {
    const rules = HEALING_COMBAT_RULES.tourniquet;
    const patient = load({ round: 1, injuries: [wound('cut', 5)] });
    patient.treatInjury(
      'cut',
      'tourniquet',
      outcome('success'),
      { healer, difficulty: 0, roll: 90, total: 140 },
      { rules: HEALING_COMBAT_RULES },
    );
    expect(patient.injuries[0].tourniquet).toMatchObject({ tightSince: 1, bleeding: 5 });
    const upkeepIn = (round: number) => {
      (patient as { round: number }).round = round;
      patient.applyUpkeep({ tourniquet: rules });
    };
    upkeepIn(2);
    expect(patient.alerts.map(alert => alert.type)).toEqual([]);
    upkeepIn(3);
    expect(patient.alerts.map(alert => alert.type)).toEqual(['tourniquet-loosen']);
    upkeepIn(4);
    expect(patient.alerts.map(alert => alert.type)).toEqual(['tourniquet-loosen', 'limb-loss']);
    expect(patient.injuries[0].flags).toContain('limb-loss');

    patient.loosenTourniquet('cut');
    expect(patient.hp.current).toBe(45);
    expect(patient.injuries[0].tourniquet).toMatchObject({ tightSince: 5, loosenedAt: 4 });
    expect(patient.alerts.find(alert => alert.type === 'tourniquet-loosen')!.status).toBe('resolved');
    expect(() => patient.loosenTourniquet('missing')).toThrow();
  });
});

describe('systemic shock with two healers (workspace spec 068, decision 6)', () => {
  it('treating the wound of the critical marks its dying effect, and the next stabilize success removes it', () => {
    const source = { kind: 'critical' as const, actionId: 'attack-7', criticalKey: 'k1' };
    const dying = new ActorRoundEffect('dying-1', 'dying', undefined, 3, 1, undefined, undefined, undefined, source);
    const patient = load({ effects: [dying], injuries: [wound('cut', 0, { source })] });
    // The first healer keeps the patient alive
    patient.stabilize('dying-1', 1);
    expect(patient.effects[0].rounds).toBe(4);
    // The second treats the wound that kills
    patient.treatInjury(
      'cut',
      'dress',
      outcome('success'),
      { healer, difficulty: 0, roll: 90, total: 140 },
      { rules: HEALING_COMBAT_RULES },
    );
    expect(patient.effects[0].causeTreated).toBe(true);
    // A failure keeps it; the next success removes it
    patient.stabilize('dying-1', 0);
    expect(patient.effects).toHaveLength(1);
    patient.stabilize('dying-1', 1);
    expect(patient.effects).toEqual([]);
  });
});

describe('items consumed and temporary modifiers (workspace spec 068, decisions 7 and 19)', () => {
  it('adds up the units of each item consumed, and copies them to the next round', () => {
    const round = load();
    round.recordItemConsumed('leaf');
    round.recordItemConsumed('leaf');
    round.recordItemConsumed('root', 3);
    expect(round.itemsConsumed).toEqual([
      { itemId: 'leaf', amount: 2 },
      { itemId: 'root', amount: 3 },
    ]);
    expect(round.getProps().itemsConsumed).toEqual(round.itemsConsumed);
  });

  it('adds the modifiers of a kind to the breakdown with their rule, and removes one', () => {
    const round = load();
    const base = { createdAt: '2026-11-02T00:00:00.000Z', tacticalGameId: 'game-1' };
    round.addTemporaryModifier({ id: 'm1', kind: 'morale', value: -10, source: 'morale-absolute-failure', days: null, ...base });
    round.addTemporaryModifier({ id: 'm2', kind: 'fear-rr', value: 20, source: 'rally-unusual', days: 1, ...base });
    expect(temporaryModifierLines(round.temporaryModifiers, 'fear-rr')).toEqual([
      { key: 'temporary-rally-unusual', value: 20, group: 'situation', rule: '§14.3 Table 14-3c' },
    ]);
    round.removeTemporaryModifier('m1');
    expect(round.temporaryModifiers.map(each => each.id)).toEqual(['m2']);
    expect(() => round.removeTemporaryModifier('m1')).toThrow(expect.objectContaining({ code: 'err-temporary-modifier-not-found' }));
  });

  it('raises the hits of the game, current and maximum', () => {
    const round = load({ hp: [50, 30] });
    round.raiseHits(5);
    expect([round.hp.max, round.hp.current]).toEqual([55, 35]);
  });
});

describe('fear states (workspace spec 068, decision 14)', () => {
  it('only a broken actor drops what it holds in its hands', () => {
    expect(() => load({ effects: [effect('fear-routed', 10)] }).dropHeldItems()).toThrow(
      expect.objectContaining({ code: 'err-action-fear', details: { state: 'fear-routed' } }),
    );
  });

  it('an unable healer cannot treat', () => {
    expect(load().canHeal()).toBe(true);
    expect(load({ effects: [effect('stunned', 0, 1)] }).canHeal()).toBe(false);
    expect(load({ effects: [effect('fear-broken', 10)] }).canHeal()).toBe(false);
  });
});

describe('interrupting a medical action (workspace spec 068, decision 4)', () => {
  it('a new action takes the AP of the phase a medical action held, and interrupts it', () => {
    const healer = load();
    const medical = Action.fromProps({ ...actionProps('medical'), id: 'medical-1' });
    healer.spend(1, 'medical-1', 1);
    const plan = Action.checkDeclaration(healer, [medical], { actionType: 'other', phaseStart: 1, freeAction: false }, 1);
    expect(plan).toMatchObject({ interrupted: [medical], released: ['medical-1'], spend: { phase: 1, ap: 1 } });
    // A movement does not interrupt it, and finds no AP left
    expect(() => Action.checkDeclaration(healer, [medical], { actionType: 'movement', phaseStart: 1, freeAction: false }, 1)).toThrow(
      expect.objectContaining({ code: 'err-action-points-exceeded' }),
    );
  });
});

function actionProps(actionType: ActionProps['actionType']): ActionProps {
  return {
    id: 'action-1',
    gameId: 'game-1',
    actorId: 'actor-1',
    round: 1,
    actionType,
    freeAction: false,
    phaseStart: 1,
    phaseEnd: null,
    status: 'declared',
    actionPoints: null,
    movement: null,
    attacks: null,
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    resolution: { mode: 'normal' },
    owner: 'owner',
    createdAt: new Date(),
    updatedAt: null,
  };
}
