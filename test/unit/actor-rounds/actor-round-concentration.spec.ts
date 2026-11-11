import { describe, expect, it, vi } from 'vitest';
import type { CommandBus } from '@nestjs/cqrs';
import { InterruptHeldActionsCommand } from '../../../src/modules/actions/application/cqrs/commands/interrupt-held-actions.command.js';
import { InterruptHeldActionsHandler } from '../../../src/modules/actions/application/cqrs/handlers/interrupt-held-actions.handler.js';
import type { ActionRepository } from '../../../src/modules/actions/application/ports/action-repository.port.js';
import { Action, type ActionProps } from '../../../src/modules/actions/domain/aggregates/action.js';
import { ActionResolution } from '../../../src/modules/actions/domain/value-objects/action-resolution.vo.js';
import type { ActionType } from '../../../src/modules/actions/domain/value-objects/action-type.vo.js';
import { ResolveAlertCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/resolve-alert.command.js';
import { ResolveAlertHandler } from '../../../src/modules/actor-rounds/application/cqrs/handlers/resolve-alert.handler.js';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundEffect } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundDto } from '../../../src/modules/actor-rounds/interfaces/http/dto/actor-round.dto.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { effect, load } from './actor-round-test.factory.js';

const action = (id: string, actionType: ActionType, phaseStart: number, extra: Partial<ActionProps> = {}): Action =>
  Action.fromProps({
    id,
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
    resolution: ActionResolution.normal(),
    owner: 'owner',
    createdAt: new Date('2026-11-05T10:00:00Z'),
    updatedAt: null,
    ...extra,
  });

const concentrating = (data: Record<string, unknown> = {}) => {
  const added = new ActorRoundEffect('focus-1', 'concentrating', undefined, undefined);
  added.data = data;
  return added;
};

const mentalFocusAlerts = (actorRound: ActorRound) =>
  actorRound.alerts.filter(alert => alert.type === 'mental-focus' && alert.status === 'pending');

describe('Concentration (workspace spec 077, block A2)', () => {
  it('a partial dodge makes a 2 AP melee attack take the four phases (decision A2.2)', () => {
    const actorRound = load();
    actorRound.setDefenseMode('partial', undefined);
    const melee = action('melee', 'melee_attack', 1);
    [1, 2, 3, 4].forEach(phase => actorRound.spend(phase, 'melee', 1));

    expect(actorRound.concentration()).toEqual([{ kind: 'partial-dodge' }]);
    expect(actorRound.apLedger.every(entry => entry.concentrated)).toBe(true);
    expect(actorRound.spentByAction('melee')).toBe(2);
    expect(melee.apOf(actorRound, 4)).toBe(2);
    expect(actorRound.apModifiers).toContainEqual(expect.objectContaining({ source: 'concentration', kind: 'cost-multiplier', value: 2 }));
    expect(actorRound.costMultiplier()).toBe(2);
  });

  it('counts the AP spent before the focus whole, and the odd concentrated AP rounds down', () => {
    const actorRound = load();
    actorRound.spend(1, 'melee', 1);
    actorRound.setDefenseMode('partial', undefined);
    actorRound.spend(2, 'melee', 1);
    actorRound.spend(3, 'melee', 1);
    actorRound.spend(4, 'melee', 1);

    expect(actorRound.apLedger.map(entry => !!entry.concentrated)).toEqual([false, true, true, true]);
    expect(actorRound.spentByAction('melee')).toBe(1 + 1);
  });

  it('with haste the extra AP still count half', () => {
    const actorRound = load({ effects: [effect('haste', 2)] });
    actorRound.setDefenseMode('partial', undefined);
    [1, 2, 3, 4].forEach(phase => actorRound.spend(phase, 'melee', actorRound.freeCapacity(phase)));

    expect(actorRound.totalSpent()).toBe(6);
    expect(actorRound.spentByAction('melee')).toBe(3);
  });

  it('a movement keeps its AP (it halves its BMR instead, decision A2.3)', () => {
    const actorRound = load();
    actorRound.setDefenseMode('partial', undefined);
    actorRound.spend(1, 'move', 1, 'spent', false);

    expect(actorRound.apLedger[0].concentrated).toBeUndefined();
    expect(actorRound.spentByAction('move')).toBe(1);
  });

  it('the AP of the held action itself are not halved by its own focus', () => {
    const actorRound = load();
    actorRound.syncHeldActions([{ id: 'held', status: 'held' }]);
    actorRound.spend(1, 'held', 1);
    actorRound.spend(2, 'other', 1);

    expect(actorRound.ledgerOf('held')[0].concentrated).toBeUndefined();
    expect(actorRound.ledgerOf('other')[0].concentrated).toBe(true);
  });

  it('halves the readiness AP left of a non-movement action', () => {
    const actorRound = load();
    actorRound.setDefenseMode('partial', undefined);

    expect(actorRound.costMultiplier()).toBe(2);
    expect(Math.floor(actorRound.remainingCapacity(1) / actorRound.costMultiplier())).toBe(2);
  });

  it('two foci at once only allow a movement (decision A2.4)', () => {
    const actorRound = load();
    actorRound.setDefenseMode('partial', undefined);
    actorRound.syncHeldActions([{ id: 'held', status: 'held' }]);

    expect(actorRound.isDoubleConcentrating()).toBe(true);
    expect(() => Action.checkDeclaration(actorRound, [], { actionType: 'melee_attack', phaseStart: 1, freeAction: false }, 1, [])).toThrow(
      expect.objectContaining({ code: 'err-action-double-concentration' }),
    );
    expect(() =>
      Action.checkDeclaration(actorRound, [], { actionType: 'movement', phaseStart: 1, freeAction: false }, 1, []),
    ).not.toThrow();
  });

  it('keeps the round a held action started in when it goes on in the next round', () => {
    const actorRound = load({ round: 3 });
    actorRound.syncHeldActions([{ id: 'held-r3', status: 'held' }]);
    expect(actorRound.heldActions).toEqual([{ actionId: 'held-r3', since: 3 }]);

    const next = ActorRound.createFromPrevious(actorRound);
    next.syncHeldActions([{ id: 'held-r4', status: 'held', continuesActionId: 'held-r3' }]);

    expect(next.heldActions).toEqual([{ actionId: 'held-r4', since: 3 }]);
  });

  it('normalizes a concentrating effect and rejects an unknown kind', () => {
    const actorRound = load({ round: 2 });
    actorRound.applyAttackResults(undefined, [concentrating({ kind: 'spell-preparation', actionId: 'spell-1' })], undefined);

    expect(actorRound.concentration()).toEqual([{ kind: 'spell-preparation', effectId: 'focus-1', actionId: 'spell-1', since: 2 }]);
    expect(() => actorRound.applyAttackResults(undefined, [concentrating({ kind: 'daydream' })], undefined)).toThrow(
      expect.objectContaining({ code: 'err-effect-invalid-value' }),
    );
  });

  it('unconsciousness breaks every focus (decision A2.5)', () => {
    const actorRound = load();
    actorRound.setDefenseMode('partial', undefined);
    actorRound.syncHeldActions([{ id: 'held', status: 'held' }]);
    actorRound.applyAttackResults(undefined, [concentrating()], undefined);

    actorRound.applyAttackResults(undefined, [effect('unconscious')], undefined);

    expect(actorRound.concentration()).toEqual([]);
    expect(actorRound.defenseMode).toMatchObject({ dodge: 'none' });
    expect(actorRound.syncHeldActions([{ id: 'held', status: 'held' }])).toBe(false);
    expect(actorRound.costMultiplier()).toBe(1);
  });

  it('a stun while concentrating asks for a Mental Focus maneuver', () => {
    const actorRound = load();
    actorRound.setDefenseMode('partial', undefined);

    actorRound.applyAttackResults(undefined, [effect('stunned', undefined, 2)], undefined);

    expect(mentalFocusAlerts(actorRound)).toHaveLength(1);
    expect(mentalFocusAlerts(actorRound)[0].getModifierText('reason')).toBe('stunned');
  });

  it('the upkeep asks for a Mental Focus maneuver with two lasting foci, and every six rounds of one', () => {
    const double = load();
    double.syncHeldActions([{ id: 'held', status: 'held' }]);
    double.applyAttackResults(undefined, [concentrating({ kind: 'hold-position' })], undefined);
    double.applyUpkeep();
    expect(mentalFocusAlerts(double).map(alert => alert.getModifierText('reason'))).toEqual(['double']);

    const extended = load({ round: 5 });
    extended.applyAttackResults(undefined, [concentrating({ kind: 'manual', since: 1 })], undefined);
    extended.applyUpkeep();
    const alerts = mentalFocusAlerts(extended);
    expect(alerts.map(alert => alert.getModifierText('reason'))).toEqual(['extended']);
    expect(alerts[0].getModifierValue('rounds')).toBe(6);

    const short = load({ round: 3 });
    short.applyAttackResults(undefined, [concentrating({ since: 1 })], undefined);
    short.applyUpkeep();
    expect(mentalFocusAlerts(short)).toEqual([]);
  });

  it('a failed Mental Focus maneuver breaks the foci and returns the held actions; a passed one keeps them', () => {
    const actorRound = load();
    actorRound.syncHeldActions([{ id: 'held', status: 'held' }]);
    actorRound.applyAttackResults(undefined, [effect('stunned', undefined, 2)], undefined);
    const [passedAlert] = mentalFocusAlerts(actorRound);

    expect(actorRound.resolveAlert(passedAlert.id, 'passed')).toEqual([]);
    expect(actorRound.concentration()).toHaveLength(1);
    expect(passedAlert.getModifierText('outcome')).toBe('passed');

    actorRound.applyUpkeep();
    const [failedAlert] = mentalFocusAlerts(actorRound);
    expect(actorRound.resolveAlert(failedAlert.id, 'failed')).toEqual(['held']);
    expect(actorRound.concentration()).toEqual([]);
  });

  it('shows the foci and the concentrated ledger entries in the DTO', () => {
    const actorRound = load();
    actorRound.setDefenseMode('partial', undefined);
    actorRound.spend(1, 'melee', 1);

    const dto = ActorRoundDto.fromEntity(actorRound);

    expect(dto.concentration).toEqual([{ kind: 'partial-dodge' }]);
    expect(dto.apLedger?.[0]).toMatchObject({ concentrated: true });
  });
});

describe('Mental Focus resolution handlers (workspace spec 077, decision A2.4)', () => {
  it('interrupts the held actions of a failed maneuver', async () => {
    const actorRound = Object.assign(load(), { id: 'ar-1' });
    actorRound.syncHeldActions([{ id: 'held', status: 'held' }]);
    actorRound.applyAttackResults(undefined, [effect('stunned', undefined, 2)], undefined);
    const [alert] = mentalFocusAlerts(actorRound);
    const execute = vi.fn(() => Promise.resolve([]));
    const handler = new ResolveAlertHandler(
      {
        findById: vi.fn(() => Promise.resolve(actorRound)),
        update: vi.fn((updated: ActorRound) => Promise.resolve(updated)),
      } as unknown as ActorRoundRepository,
      { findById: vi.fn(() => Promise.resolve(null)) } as unknown as GameRepository,
      { execute } as unknown as CommandBus,
    );

    await handler.execute(new ResolveAlertCommand('ar-1', alert.id, 'user', [], 'failed'));

    expect(execute).toHaveBeenCalledWith(new InterruptHeldActionsCommand('ar-1', ['held'], 'user', []));
  });

  it('closes the held actions as interrupted in the current phase', async () => {
    const actorRound = Object.assign(load(), { id: 'ar-1' });
    actorRound.spend(1, 'held', 1);
    const held = action('held', 'melee_attack', 1, { status: 'held' });
    const done = action('done', 'melee_attack', 1, { status: 'completed' });
    const actions = new Map([
      ['held', held],
      ['done', done],
    ]);
    const update = vi.fn((updated: Action) => Promise.resolve(updated));
    const publish = vi.fn(() => Promise.resolve());
    const game = Object.assign(Object.create(Game.prototype) as Game, { phase: 'phase_3' });
    const handler = new InterruptHeldActionsHandler(
      { findById: vi.fn((id: string) => Promise.resolve(actions.get(id) ?? null)), update } as unknown as ActionRepository,
      { findById: vi.fn(() => Promise.resolve(actorRound)) } as unknown as ActorRoundRepository,
      { findById: vi.fn(() => Promise.resolve(game)) } as unknown as GameRepository,
      { publish },
    );

    const interrupted = await handler.execute(new InterruptHeldActionsCommand('ar-1', ['held', 'done', 'gone'], 'user', []));

    expect(interrupted.map(each => each.id)).toEqual(['held']);
    expect(held).toMatchObject({ status: 'interrupted', phaseEnd: 1, actionPoints: 1 });
    expect(done.status).toBe('completed');
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
