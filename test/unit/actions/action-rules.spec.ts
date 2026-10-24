import { describe, expect, it } from 'vitest';
import { Action, type ActionProps } from '../../../src/modules/actions/domain/aggregates/action.js';
import { ActionParry } from '../../../src/modules/actions/domain/value-objects/action-attack-parry.vo.js';
import { ActionAttack } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import type { ActionType } from '../../../src/modules/actions/domain/value-objects/action-type.vo.js';
import { DeclareActorParryCommand } from '../../../src/modules/actor-rounds/application/cqrs/commands/declare-actor-parry.command.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundDefense } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-defense.vo.js';
import { attack, effect, load, type LoadOptions } from '../actor-rounds/actor-round-test.factory.js';

const action = (actorId: string, actionType: ActionType, phaseStart: number, extra: Partial<ActionProps> = {}): Action =>
  Action.fromProps({
    id: `${actorId}-${actionType}-${phaseStart}`,
    gameId: 'game-1',
    actorId,
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
    ...extra,
  });

const actor = (actorId: string, options: LoadOptions & { protect?: number } = {}): ActorRound => {
  const round = load({ attacks: [attack('mainHand', 100)], ...options });
  return Object.assign(round, {
    actorId,
    defense: new ActorRoundDefense(10, 1, null, null, null, null, null, options.protect ?? 0),
  });
};

const meleeAttack = (targetId: string, protectors: string[] | null = null, positions?: ActionAttack['protectorPositions']) =>
  ({
    attackName: 'mainHand',
    type: 'melee',
    modifiers: { targetId },
    status: 'pending_attack_roll',
    protectors,
    protectorPositions: positions,
  }) as unknown as ActionAttack;

describe('Action declaration (§8.1, §8.3; spec 011, §2)', () => {
  const request = (phaseStart: number, freeAction = false, actionType: ActionType = 'maneuver') => ({ actionType, phaseStart, freeAction });
  const declare = (actions: Action[], phaseStart: number, freeAction = false, options: LoadOptions = {}, currentPhase = phaseStart) =>
    Action.checkDeclaration(load(options), actions, request(phaseStart, freeAction), currentPhase);

  it('takes 1 AP of the current phase for an action', () => {
    expect(declare([], 2)).toEqual({ spend: { phase: 2, ap: 1, kind: 'spent' }, interrupted: [] });
  });

  it('rejects an action outside the current phase, past or future', () => {
    expect(() => declare([], 1, false, {}, 2)).toThrow(expect.objectContaining({ code: 'err-action-invalid-phase' }));
    expect(() => declare([], 3, false, {}, 2)).toThrow(expect.objectContaining({ code: 'err-action-invalid-phase' }));
    expect(() => declare([], 5)).toThrow(expect.objectContaining({ code: 'err-action-invalid-phase' }));
    expect(() => declare([], 0)).toThrow(expect.objectContaining({ code: 'err-action-invalid-phase' }));
  });

  it('blocks the phases a surprised actor lost, 2 by default', () => {
    const surprised = { effects: [effect('surprised')] };
    const perceptive = { effects: [effect('surprised', 1)] };

    expect(() => declare([], 2, false, surprised)).toThrow(expect.objectContaining({ code: 'err-action-surprised-phase' }));
    expect(() => declare([], 3, false, surprised)).not.toThrow();
    expect(() => declare([], 2, false, perceptive)).not.toThrow();
  });

  it('rejects an action in a phase whose AP are spent', () => {
    const actorRound = load();
    actorRound.spend(2, 'other-action', 1);

    expect(() => Action.checkDeclaration(actorRound, [], request(2), 2)).toThrow(
      expect.objectContaining({ code: 'err-action-points-exceeded' }),
    );
  });

  it('rejects any action of a flatfooted actor', () => {
    expect(() => declare([], 4, false, { effects: [effect('flatfooted')] })).toThrow(
      expect.objectContaining({ code: 'err-action-flatfooted' }),
    );
  });

  it('rejects an attack of a routed or broken actor, not of a retreating one (workspace spec 022)', () => {
    const attackOf = (status: string) =>
      Action.checkDeclaration(load({ effects: [effect(status, 30)] }), [], request(1, false, 'melee_attack'), 1);
    expect(() => attackOf('fear-routed')).toThrow(expect.objectContaining({ code: 'err-action-fear' }));
    expect(() => attackOf('fear-broken')).toThrow(expect.objectContaining({ code: 'err-action-fear' }));
    expect(() => attackOf('fear-retreat')).not.toThrow();
    expect(() => declare([], 1, false, { effects: [effect('fear-broken', 30)] })).not.toThrow();
  });

  it('frightens with the worst fear and refuses an unknown one (workspace spec 022)', () => {
    const round = load();
    expect(round.changeFear(1)).toBeUndefined();
    expect(round.frighten('fear-retreat', 30).status).toBe('fear-retreat');
    expect(round.frighten('fear-balk', 5).status).toBe('fear-retreat');
    expect(round.changeFear(5)?.status).toBe('fear-broken');
    expect(() => round.frighten('fear-panic', 1)).toThrow(expect.objectContaining({ code: 'err-effect-invalid-fear' }));
  });

  it('criterion 10: the first instantaneous action of the round takes 0 AP, the next ones 1 AP of free capacity', () => {
    const actorRound = load();
    const first = action('actor-1', 'other', 2, { freeAction: true });

    expect(Action.checkDeclaration(actorRound, [], request(2, true, 'other'), 2).spend).toEqual({ phase: 2, ap: 0, kind: 'instant' });
    expect(Action.checkDeclaration(actorRound, [first], request(2, true, 'other'), 2).spend).toEqual({ phase: 2, ap: 1, kind: 'instant' });
    actorRound.spend(2, 'attack', 1);
    expect(() => Action.checkDeclaration(actorRound, [first], request(2, true, 'other'), 2)).toThrow(
      expect.objectContaining({ code: 'err-action-points-exceeded' }),
    );
  });

  it('never takes an attack as an instantaneous action', () => {
    expect(() => Action.checkDeclaration(load(), [], request(1, true, 'melee_attack'), 1)).toThrow(
      expect.objectContaining({ code: 'err-action-free-not-allowed' }),
    );
  });
});

describe('Parry eligibility (§9.6 Parrying)', () => {
  it('lets parry an actor whose last action with AP is a melee attack, in progress or completed', () => {
    const inProgress = action('defender', 'melee_attack', 1);
    const completed = action('defender', 'melee_attack', 1, { phaseEnd: 2, status: 'completed' });
    const thenMoved = action('defender', 'movement', 3, { phaseEnd: 3, status: 'completed' });

    expect(Action.canParry('defender', [inProgress], 2)).toBe(true);
    expect(Action.canParry('defender', [completed], 3)).toBe(true);
    // Movement does not interrupt the melee.
    expect(Action.canParry('defender', [completed, thenMoved], 4)).toBe(true);
  });

  it('does not let parry an actor whose last action is not melee, or whose melee attack has not started', () => {
    const melee = action('defender', 'melee_attack', 1, { phaseEnd: 1, status: 'completed' });
    const maneuver = action('defender', 'maneuver', 2, { phaseEnd: 2, status: 'completed' });
    const later = action('defender', 'melee_attack', 3);

    expect(Action.canParry('defender', [melee, maneuver], 3)).toBe(false);
    expect(Action.canParry('defender', [later], 2)).toBe(false);
    expect(Action.canParry('defender', [], 2)).toBe(false);
  });
});

describe('Parry and protect options', () => {
  it('offers one parry per defender, however many attacks the action aims at it', () => {
    const defender = actor('defender');
    const attackAction = action('attacker', 'melee_attack', 1, { attacks: [meleeAttack('defender'), meleeAttack('defender')] });

    attackAction.processParryOptions([defender], [action('defender', 'melee_attack', 1)], 2);

    expect(attackAction.parries!.map(parry => [parry.parryType, parry.parryAvailable])).toEqual([['parry', 100]]);
  });

  it('keeps the parry given to the same foe in an earlier action of the round, already paid', () => {
    const defender = actor('defender');
    const earlier = action('attacker', 'melee_attack', 1, {
      phaseEnd: 2,
      status: 'completed',
      parries: [new ActionParry('p-1', 'defender', 'defender', 'parry', 100, 30)],
    });
    const attackAction = action('attacker', 'melee_attack', 3, { attacks: [meleeAttack('defender')] });

    attackAction.processParryOptions([defender], [earlier, action('defender', 'melee_attack', 1)], 3);

    expect(attackAction.parries).toEqual([expect.objectContaining({ parryAvailable: 30, parry: 30, carriedOver: true })]);
  });

  it('takes the Table 9-7c penalty off the protector, offset by Protect: Anika protects at -25 (§9.7)', () => {
    const anika = actor('anika', { protect: 25 });
    const talen = actor('talen');
    const attackAction = action('ogre', 'melee_attack', 1, { attacks: [meleeAttack('talen', ['anika'])] });

    attackAction.processParryOptions([anika, talen], [action('anika', 'melee_attack', 1)], 1);

    const protect = attackAction.parries!.find(parry => parry.parryType === 'protect')!;
    expect(protect).toMatchObject({ actorId: 'anika', targetActorId: 'talen', penalty: -25, parryAvailable: 75, protectPosition: 'other' });
    // Protecting with 55 spends the 25 of the penalty too.
    protect.parry = 55;
    expect(DeclareActorParryCommand.fromParry('game-1', 'ogre', 1, protect, 'user', []).parry).toBe(80);
  });

  it('lets protect without the skill, by position, and never turns the penalty into a bonus', () => {
    const anyone = actor('anyone');
    const skilled = actor('skilled', { protect: 60 });
    const talen = actor('talen');
    const attackAction = action('ogre', 'melee_attack', 1, {
      attacks: [meleeAttack('talen', ['anyone', 'skilled'], { anyone: 'protector_between', skilled: 'defender_between' })],
    });

    attackAction.processParryOptions(
      [anyone, skilled, talen],
      [action('anyone', 'melee_attack', 1), action('skilled', 'melee_attack', 1)],
      1,
    );

    expect(attackAction.parries!.map(parry => [parry.actorId, parry.penalty, parry.parryAvailable])).toEqual([
      ['anyone', -25, 75],
      ['skilled', -40, 60],
    ]);
    expect(Action.protectPenalty('protector_between', 40)).toBe(0);
  });
});
