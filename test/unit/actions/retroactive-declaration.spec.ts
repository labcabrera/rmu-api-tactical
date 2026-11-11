import { describe, expect, it } from 'vitest';
import { Action, type ActionProps } from '../../../src/modules/actions/domain/aggregates/action.js';
import type { ActionType } from '../../../src/modules/actions/domain/value-objects/action-type.vo.js';
import { ActionResolution } from '../../../src/modules/actions/domain/value-objects/action-resolution.vo.js';
import type { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { load } from '../actor-rounds/actor-round-test.factory.js';

/* Workspace spec 089: the game master declares in a past phase of the round. */

const open = (actionType: ActionType, phaseStart: number, extra: Partial<ActionProps> = {}): Action =>
  Action.fromProps({
    id: `${actionType}-${phaseStart}`,
    gameId: 'game-1',
    actorId: 'actor-1',
    round: 1,
    actionType,
    freeAction: false,
    phaseStart,
    phaseEnd: null,
    status: 'declared',
    actionPoints: null,
    movement: null,
    attacks: null,
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'owner',
    createdAt: new Date(),
    updatedAt: null,
    resolution: ActionResolution.normal(),
    ...extra,
  });

const request = (phaseStart: number, extra: object = {}) => ({
  actionType: 'maneuver' as ActionType,
  phaseStart,
  freeAction: false,
  retroactive: true,
  ...extra,
});

const declare = (actorRound: ActorRound, phaseStart: number, currentPhase: number): Action => {
  const action = open('maneuver', phaseStart, { id: 'late', retroactive: true });
  action.applyDeclaration(actorRound, Action.checkDeclaration(actorRound, [], request(phaseStart), currentPhase), currentPhase);
  return action;
};

const ledger = (actorRound: ActorRound, id: string) =>
  actorRound.ledgerOf(id).map(entry => ({ phase: entry.phase, ap: entry.ap, kind: entry.kind }));

describe('Retroactive declaration (workspace spec 089)', () => {
  it('leaves the ledger as if it had been declared on time', () => {
    const onTime = load();
    const action = open('maneuver', 1, { id: 'late' });
    action.applyDeclaration(onTime, Action.checkDeclaration(onTime, [], { ...request(1), retroactive: false }, 1), 1);
    action.advanceToPhase(onTime, 2);
    action.advanceToPhase(onTime, 3);

    const late = load();
    const retroactive = declare(late, 1, 3);

    expect(ledger(late, 'late')).toEqual(ledger(onTime, 'late'));
    expect(ledger(late, 'late')).toHaveLength(3);
    expect(retroactive.actionPoints).toBe(3);
  });

  it('only takes AP from its first phase on', () => {
    const actorRound = load();
    declare(actorRound, 2, 3);
    expect(ledger(actorRound, 'late').map(entry => entry.phase)).toEqual([2, 3]);
    expect(actorRound.freeCapacity(1)).toBe(1);
  });

  it('is only for a past phase', () => {
    const invalid: unknown = expect.objectContaining({ code: 'err-action-invalid-phase' });
    expect(() => Action.checkDeclaration(load(), [], request(3), 3)).toThrow(invalid);
    expect(() => Action.checkDeclaration(load(), [], request(4), 3)).toThrow(invalid);
    expect(() => Action.checkDeclaration(load(), [], request(0), 3)).toThrow(invalid);
  });

  it('still needs the flag to declare in a past phase', () => {
    expect(() => Action.checkDeclaration(load(), [], request(1, { retroactive: false }), 3)).toThrow(
      expect.objectContaining({ code: 'err-action-invalid-phase' }),
    );
  });

  it('cannot be forced', () => {
    expect(() => Action.checkDeclaration(load(), [], request(1, { forced: 'gm' }), 3)).toThrow(
      expect.objectContaining({ code: 'err-action-invalid-phase' }),
    );
  });

  it('rejects a phase on the way without free AP and records nothing', () => {
    const actorRound = load();
    actorRound.spend(2, 'other-action', 1);
    expect(() => declare(actorRound, 1, 3)).toThrow(expect.objectContaining({ code: 'err-action-retroactive-no-ap' }));
    expect(ledger(actorRound, 'late')).toEqual([]);
  });

  it('rejects the declaration with an open action instead of interrupting it', () => {
    const actorRound = load();
    const other = open('melee_attack', 3);
    expect(() => Action.checkDeclaration(actorRound, [other], request(1), 3)).toThrow(
      expect.objectContaining({ code: 'err-action-retroactive-open-action' }),
    );
    expect(other.status).toBe('declared');
  });

  it('takes one entry of its phase for an instantaneous action', () => {
    const actorRound = load();
    const action = open('maneuver', 1, { id: 'late', retroactive: true, freeAction: true });
    const plan = Action.checkDeclaration(actorRound, [], request(1, { freeAction: true }), 3);
    action.applyDeclaration(actorRound, plan, 3);
    expect(ledger(actorRound, 'late')).toEqual([{ phase: 1, ap: 0, kind: 'instant' }]);
  });
});
