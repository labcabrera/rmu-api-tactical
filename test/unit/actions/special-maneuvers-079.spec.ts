import { describe, expect, it } from 'vitest';
import { CreateActionCommand } from '../../../src/modules/actions/application/cqrs/commands/create-action.command.js';
import type { PrepareAttackCommandModifiers } from '../../../src/modules/actions/application/cqrs/commands/prepare-attack.command.js';
import { PrepareAttackCommand } from '../../../src/modules/actions/application/cqrs/commands/prepare-attack.command.js';
import { CreateActionHandler } from '../../../src/modules/actions/application/cqrs/handlers/create-action.handler.js';
import { PrepareAttackHandler } from '../../../src/modules/actions/application/cqrs/handlers/prepare-attack.handler.js';
import { Action } from '../../../src/modules/actions/domain/aggregates/action.js';
import { ActionAttackModifiers } from '../../../src/modules/actions/domain/value-objects/action-attack-modifiers.vo.js';
import { ActionAttack } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { ActionResolution, isApFreeReason } from '../../../src/modules/actions/domain/value-objects/action-resolution.vo.js';
import type { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { load } from '../actor-rounds/actor-round-test.factory.js';

const action = (actionType: Action['actionType'] = 'ranged_attack') =>
  Action.fromProps({
    id: 'action-1',
    gameId: 'game-1',
    actorId: 'archer',
    round: 1,
    actionType,
    freeAction: false,
    phaseStart: 1,
    phaseEnd: null,
    status: 'declared',
    actionPoints: 4,
    movement: null,
    attacks: null,
    parries: null,
    maneuver: null,
    fatigue: null,
    description: null,
    owner: 'owner-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: null,
  });

const attack = (type: ActionAttack['type'], extra: Partial<ActionAttackModifiers>) => {
  const modifiers = Object.assign(Object.create(ActionAttackModifiers.prototype) as ActionAttackModifiers, { targetId: 'orc' }, extra);
  return new ActionAttack('bow', type, modifiers, undefined, undefined, undefined, 'pending_attack_roll', null);
};

const strayShotData = { actionId: 'action-0', attackName: 'bow', targetActorId: 'ally', candidates: ['ally', 'foe'], round: 2 };

describe('Workspace spec 079, A6-A7: checks of the prepared attack', () => {
  it('a disarm needs the defender roll and is not a spell attack', () => {
    expect(() => PrepareAttackHandler.checkSpecialManeuvers(action(), attack('thrown', { attackMode: 'disarm' }))).toThrow(
      expect.objectContaining({ code: 'err-disarm-defense-roll-required' }),
    );
    expect(() => PrepareAttackHandler.checkSpecialManeuvers(action('cast_spell'), attack('ranged', { attackMode: 'subdual' }))).toThrow(
      expect.objectContaining({ code: 'err-attack-mode-invalid' }),
    );
    expect(() =>
      PrepareAttackHandler.checkSpecialManeuvers(action(), attack('melee', { attackMode: 'disarm', disarmDefenseRoll: 0 })),
    ).not.toThrow();
  });

  it('only a ranged attack has combatants in the way, never the target or the attacker', () => {
    expect(() => PrepareAttackHandler.checkSpecialManeuvers(action(), attack('melee', { meleeCoverActorIds: ['ally'] }))).toThrow(
      expect.objectContaining({ code: 'err-melee-cover-invalid', details: { reason: 'melee' } }),
    );
    expect(() => PrepareAttackHandler.checkSpecialManeuvers(action(), attack('ranged', { meleeCoverActorIds: ['orc'] }))).toThrow(
      expect.objectContaining({ code: 'err-melee-cover-invalid', details: { reason: 'self' } }),
    );
    expect(() => PrepareAttackHandler.checkSpecialManeuvers(action(), attack('ranged', { meleeCoverActorIds: ['ally'] }))).not.toThrow();
  });

  it('the attack of a stray shot goes at OB 0, without cover, against the combatant chosen with the same weapon', () => {
    const stray = action();
    stray.strayShot = { alertId: 'alert-1', triggerActionId: 'action-0', attackName: 'bow', targetActorId: 'ally' };
    const modifiers = {
      targetId: 'ally',
      bo: 90,
      cover: 'hard_half',
      special: { meleeCoverActorIds: ['foe'], attackMode: 'subdual' },
    } as unknown as PrepareAttackCommandModifiers;
    const command = new PrepareAttackCommand('action-1', [{ attackName: 'bow', modifiers, protectors: ['x'] }], 'user', []);

    PrepareAttackHandler.applyStrayShot(stray, command);

    expect(command.attacks[0]).toMatchObject({ modifiers: { bo: 0, cover: 'none', special: { attackMode: 'normal' } }, protectors: null });
    const other = new PrepareAttackCommand(
      'action-1',
      [{ attackName: 'bow', modifiers: { ...modifiers, targetId: 'foe' }, protectors: null }],
      'u',
      [],
    );
    expect(() => PrepareAttackHandler.applyStrayShot(stray, other)).toThrow(expect.objectContaining({ code: 'err-stray-shot-invalid' }));
  });
});

describe('Workspace spec 079, A6: stray-shot alert and the forced attack', () => {
  const command = (alertId?: string) =>
    new CreateActionCommand('game-1', 'archer', 'ranged_attack', false, 1, undefined, '', 'user', [], {
      reason: 'stray-shot',
      alertId,
    });

  it('raises one alert per missed attack, with the combatant chosen', () => {
    const round = load();
    expect(round.addStrayShotAlert(strayShotData)).toBeDefined();
    expect(round.addStrayShotAlert(strayShotData)).toBeUndefined();
    expect(round.alerts).toHaveLength(1);
    expect(round.alerts[0]).toMatchObject({ type: 'stray-shot', status: 'pending' });
    expect(round.alerts[0].getModifierText('targetActorId')).toBe('ally');
  });

  it('the forced attack takes the alert of this round and resolves it', () => {
    const round = load();
    const alert = round.addStrayShotAlert(strayShotData)!;

    expect(() => CreateActionHandler.declareStrayShot(command(alert.id), round, { round: 3 } as Game)).toThrow(
      expect.objectContaining({ code: 'err-stray-shot-not-available' }),
    );
    expect(CreateActionHandler.declareStrayShot(command(alert.id), round, { round: 2 } as Game)).toEqual({
      alertId: alert.id,
      triggerActionId: 'action-0',
      attackName: 'bow',
      targetActorId: 'ally',
    });
    expect(alert.status).toBe('resolved');
    expect(() => CreateActionHandler.declareStrayShot(command(alert.id), round, { round: 2 } as Game)).toThrow(
      expect.objectContaining({ code: 'err-stray-shot-not-available' }),
    );
  });

  it('the game master can dismiss it', () => {
    const round = load();
    const alert = round.addStrayShotAlert(strayShotData)!;
    round.resolveAlert(alert.id);
    expect(alert.status).toBe('resolved');
  });

  it('a stray shot takes no AP, is only a ranged attack and cannot force an open action', () => {
    expect(isApFreeReason('stray-shot')).toBe(true);
    expect(ActionResolution.forced('stray-shot').apSource).toBe('none');
    const round = load();
    expect(() =>
      Action.checkDeclaration(round, [], { actionType: 'melee_attack', phaseStart: 1, freeAction: false, forced: 'stray-shot' }, 1),
    ).toThrow(expect.objectContaining({ code: 'err-stray-shot-invalid' }));
    expect(
      Action.checkDeclaration(round, [], { actionType: 'ranged_attack', phaseStart: 1, freeAction: false, forced: 'stray-shot' }, 1),
    ).toEqual({ spend: null, interrupted: [] });
    expect(() => action().force(round, 1, 'stray-shot')).toThrow(expect.objectContaining({ code: 'err-action-force-invalid-reason' }));
  });
});

describe('Workspace spec 079, A7: a successful disarm', () => {
  it('asks for the breakage check of the weapons in hand, then the shield', () => {
    const round = load();
    round.items = [
      { itemId: 'mail', kind: 'armor', slot: 'body' },
      { itemId: 'shield', kind: 'shield', slot: 'offHand' },
      { itemId: 'sword', kind: 'weapon', slot: 'mainHand' },
    ] as unknown as typeof round.items;

    round.addDisarmBreakageAlert();

    const alert = round.alerts[0];
    expect(alert.type).toBe('breakage');
    expect(alert.getModifierText('origin')).toBe('disarm');
    expect(alert.getModifierText('itemId')).toBe('sword');
    expect(alert.modifiers!.filter(m => m.key === 'candidate').map(m => m.modifier)).toEqual(['sword', 'shield']);
  });
});
