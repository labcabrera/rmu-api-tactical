import { describe, expect, it, vi } from 'vitest';
import type { ActorRoundRepository } from '../../../src/modules/actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAlert } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import { buildInjury, type Injury } from '../../../src/modules/actor-rounds/domain/value-objects/injury.vo.js';
import { ActorRoundAlertDto } from '../../../src/modules/actor-rounds/interfaces/http/dto/actor-round-alert.dto.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import type { GamePhase } from '../../../src/modules/games/domain/value-objects/game-phase.vo.js';
import { ResistanceRollCommand } from '../../../src/modules/psychology/application/cqrs/commands/resistance-roll.command.js';
import { ResistanceRollHandler } from '../../../src/modules/psychology/application/cqrs/handlers/resistance-roll.handler.js';
import { HEALING_COMBAT_RULES } from '../../fixtures/healing-tables.js';
import { PSYCHOLOGY_TABLES } from '../../fixtures/psychology-tables.js';
import { load } from './actor-round-test.factory.js';

// Workspace spec 087: the resolved alerts stay in the round they were resolved in, with their result, for the round log.

const breakage = () => ActorRoundAlert.buildBreakage('critical', { candidates: ['sword'] });

describe('Alerts in the round log (workspace spec 087)', () => {
  it('only the pending alerts go to the next round, as copies with the round they were raised in', () => {
    const round = load({ round: 2 });
    const pending = breakage();
    const resolved = ActorRoundAlert.buildEndurance();
    round.alerts.push(pending, resolved);
    round.closeAlert(resolved, 3, { roll: 40 });

    const next = ActorRound.createFromPrevious(round);

    expect(next.round).toBe(3);
    expect(next.alerts.map(alert => alert.id)).toEqual([pending.id]);
    expect(next.alerts[0]).not.toBe(pending);
    expect(next.alerts[0]).toMatchObject({ raisedRound: 2, status: 'pending', resolvedRound: null });
    expect(round.alerts.find(alert => alert.id === resolved.id)).toMatchObject({
      status: 'resolved',
      raisedRound: 2,
      resolvedRound: 2,
      resolvedPhase: 3,
      result: { roll: 40 },
    });
  });

  it('an alert resolved in a later round keeps the round it was raised in', () => {
    const round = load({ round: 2 });
    round.alerts.push(breakage());
    const next = ActorRound.createFromPrevious(round);
    next.closeAlert(next.alerts[0], 5, { outcome: 'success' });
    expect(next.alerts[0]).toMatchObject({ raisedRound: 2, resolvedRound: 3, resolvedPhase: 5 });
    expect(Date.parse(next.alerts[0].resolvedAt!)).not.toBeNaN();
  });

  it('the game master dismisses a reopened wound or a suggested check, and the outcome goes to the log', () => {
    const round = load();
    const wound = ActorRoundAlert.buildWoundReopened('cut', 'exertion', 2);
    const fear = ActorRoundAlert.buildFearCheckSuggested('faction-1', 3, 0.5);
    round.alerts.push(wound, fear);
    round.resolveAlert(wound.id, undefined, undefined, 2);
    round.resolveAlert(fear.id, undefined, undefined, 5);
    expect(wound).toMatchObject({ status: 'resolved', resolvedPhase: 2, result: { outcome: 'dismissed' } });
    expect(fear).toMatchObject({ status: 'resolved', resolvedPhase: 5, result: { outcome: 'dismissed' } });
  });

  it('a confirmed death keeps its outcome; a breath check without one is not resolved', () => {
    const round = load();
    const death = ActorRoundAlert.buildDeathThreshold(-310, 1);
    const breath = ActorRoundAlert.buildBreathCheck({ round: 1, heldRounds: 3, limitRounds: 2, difficulty: 'easy', adrenalFocus: 0 });
    round.alerts.push(death, breath);
    round.resolveAlert(death.id, 'confirmed', undefined, 3);
    expect(death.result).toEqual({ outcome: 'confirmed' });
    expect(() => round.resolveAlert(breath.id)).toThrow(expect.objectContaining({ code: 'err-alert-not-resolvable' }));
    expect(breath).toMatchObject({ status: 'pending', resolvedRound: null, result: null });
    round.resolveAlert(breath.id, 'passed', undefined, 3);
    expect(breath.result).toEqual({ outcome: 'passed' });
  });

  it('a dismissed limb-loss of a tourniquet is not asked again in the next rounds', () => {
    const rules = HEALING_COMBAT_RULES.tourniquet;
    const cut: Injury = {
      ...buildInjury({ id: 'cut', type: 'cut-burn', location: 'arm', penalty: -20, bleeding: 5, source: { kind: 'critical' } }),
      tourniquet: { tightSince: 1, loosenedAt: null, bleeding: 5 },
    };
    let round = load({ round: rules.loosenEveryRounds + rules.graceRounds, injuries: [cut] });
    round.applyUpkeep({ tourniquet: rules });
    const limb = round.alerts.find(alert => alert.type === 'limb-loss')!;
    round.resolveAlert(limb.id);
    round = ActorRound.createFromPrevious(round);
    round.applyUpkeep({ tourniquet: rules });
    expect(round.alerts.filter(alert => alert.type === 'limb-loss')).toEqual([]);
  });

  it('the endurance roll closes its alert with the roll, the total, the fatigue and the hits', () => {
    const round = load();
    round.addFatigue(120);
    const alert = round.alerts[0];
    round.applyEnduranceResult(10, 3, alert.id, 'Ambush', 2, { roll: 35, total: 55 });
    expect(alert).toMatchObject({
      status: 'resolved',
      resolvedPhase: 2,
      result: { roll: 35, total: 55, values: { fatigue: 10, hits: 3 } },
    });
    // A new exertion past 100 raises a new alert: the resolved one does not count
    round.addFatigue(100);
    expect(round.alerts.filter(each => each.status === 'pending').map(each => each.type)).toEqual(['endurance']);
  });

  it('the DTO gives the round an alert was raised in, and when and how it was resolved', () => {
    const pending = breakage();
    expect(ActorRoundAlertDto.fromEntity(pending, 4)).toMatchObject({ raisedRound: 4 });
    expect(ActorRoundAlertDto.fromEntity(pending, 4).resolvedRound).toBeUndefined();
    pending.close(5, null, { outcome: 'failure', total: 30 });
    expect(ActorRoundAlertDto.fromEntity(pending, 5)).toMatchObject({
      raisedRound: 5,
      resolvedRound: 5,
      resolvedPhase: null,
      result: { outcome: 'failure', total: 30 },
    });
  });

  it('the phase of a game in the round of the actor round: 0 before the action phases, 1-4, 5 the upkeep', () => {
    const game = (phase: GamePhase) => ({ round: 2, phase });
    expect(Game.effectPhaseIn(game('declare_initiative'), 2)).toBe(0);
    expect(Game.effectPhaseIn(game('phase_3'), 2)).toBe(3);
    expect(Game.effectPhaseIn(game('upkeep'), 2)).toBe(5);
    expect(Game.effectPhaseIn(game('phase_3'), 1)).toBeUndefined();
    expect(Game.effectPhaseIn(null, 2)).toBeUndefined();
  });
});

describe('Resistance rolls that answer an alert (workspace spec 087)', () => {
  const setup = () => {
    const actorRound = Object.assign(load({ resistances: [{ resistance: 'fear', totalBonus: 20 }] }), { id: 'round-1' });
    const alert = ActorRoundAlert.buildRevulsionRr(2);
    actorRound.alerts.push(alert);
    const update = vi.fn((updated: ActorRound) => Promise.resolve(updated));
    const repository = { findById: vi.fn(() => Promise.resolve(actorRound)), update } as unknown as ActorRoundRepository;
    const games = { findById: vi.fn(() => Promise.resolve({ round: 1, phase: 'upkeep' })) } as unknown as GameRepository;
    const handler = new ResistanceRollHandler(repository, { find: vi.fn(() => Promise.resolve(PSYCHOLOGY_TABLES)) }, games);
    return { handler, alert, update };
  };
  const command = (alertId: string) => new ResistanceRollCommand('round-1', 'fear', 2, 40, [], undefined, 'u', [], undefined, alertId);

  it('a Revulsion RR closes its alert with its roll and total, and stores the actor round', async () => {
    const { handler, alert, update } = setup();
    const answer = await handler.execute(command(alert.id));
    expect(update).toHaveBeenCalledTimes(1);
    expect(alert).toMatchObject({
      status: 'resolved',
      resolvedRound: 1,
      resolvedPhase: 5,
      result: { roll: 40, total: answer.result.total },
    });
    expect(alert.result?.outcome).toBe(answer.result.resisted ? 'resisted' : (answer.result.result ?? 'failed'));
  });

  it('an RR of an alert that is not a pending RR alert is refused', async () => {
    const { handler, alert } = setup();
    await handler.execute(command(alert.id));
    await expect(handler.execute(command(alert.id))).rejects.toThrow(expect.objectContaining({ code: 'err-alert-not-resolvable' }));
    await expect(handler.execute(command('missing'))).rejects.toThrow(expect.objectContaining({ code: 'err-alert-not-resolvable' }));
  });
});
