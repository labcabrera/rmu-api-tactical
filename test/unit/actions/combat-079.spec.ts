import { describe, expect, it } from 'vitest';
import { Action, type ActionProps } from '../../../src/modules/actions/domain/aggregates/action.js';
import { ActionParry } from '../../../src/modules/actions/domain/value-objects/action-attack-parry.vo.js';
import type { ActionAttack } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import type { ActionType } from '../../../src/modules/actions/domain/value-objects/action-type.vo.js';
import { ActionApProfile, OTHER_ACTION_KINDS } from '../../../src/modules/actions/domain/value-objects/action-ap-profile.vo.js';
import { DeclareParryHandler } from '../../../src/modules/actions/application/cqrs/handlers/declare-parry.handler.js';
import { DeclareParryItem } from '../../../src/modules/actions/application/cqrs/commands/declare-parry.command.js';
import { CreateActionHandler } from '../../../src/modules/actions/application/cqrs/handlers/create-action.handler.js';
import type { CreateActionCommand } from '../../../src/modules/actions/application/cqrs/commands/create-action.command.js';
import { ActorRoundAttack } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundDefense } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-defense.vo.js';
import { attack, load } from '../actor-rounds/actor-round-test.factory.js';

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

const actor = (actorId: string): ActorRound =>
  Object.assign(load({ attacks: [attack('mainHand', 100)] }), {
    actorId,
    defense: new ActorRoundDefense(10, 1, null, null, null, null, null, 0),
  });

const meleeAttack = (targetId: string, positionalTarget = 'none') =>
  ({
    attackName: 'mainHand',
    type: 'melee',
    modifiers: { targetId, positionalTarget },
    status: 'pending_attack_roll',
  }) as unknown as ActionAttack;

/** An action of `attackerId` in which the defender parried it with `parry` OB. */
const parried = (attackerId: string, parry: number, extra: Partial<ActionProps> = {}) =>
  action(attackerId, 'melee_attack', 1, {
    status: 'completed',
    phaseEnd: 2,
    parries: [new ActionParry(`p-${attackerId}`, 'defender', 'defender', 'parry', 100, parry)],
    ...extra,
  });

describe('Workspace spec 079, A2: parry options against flank, rear and further foes (§9.6)', () => {
  it('keeps the position of the attacker and the Reverse Strike of the defender', () => {
    const attackAction = action('attacker', 'melee_attack', 2, { attacks: [meleeAttack('defender', 'rear')] });

    attackAction.processParryOptions([actor('defender')], [action('defender', 'melee_attack', 1)], 2, new Map([['defender', 45]]));

    expect(attackAction.parries![0]).toMatchObject({
      positional: { position: 'rear', penalty: -70, reverseStrike: 45 },
      parryManeuver: null,
    });
  });

  it('has no positional penalty from the front', () => {
    const attackAction = action('attacker', 'melee_attack', 2, { attacks: [meleeAttack('defender')] });

    attackAction.processParryOptions([actor('defender')], [action('defender', 'melee_attack', 1)], 2);

    expect(attackAction.parries![0].positional).toBeNull();
  });

  it('asks for a Combat Training maneuver from the second foe parried in the round', () => {
    const attackAction = action('wolf', 'melee_attack', 2, { attacks: [meleeAttack('defender')] });
    const actions = [action('defender', 'melee_attack', 1), parried('goblin', 20), parried('orc', 10), parried('troll', 0)];

    attackAction.processParryOptions([actor('defender')], actions, 2);

    expect(attackAction.parries![0].parryManeuver).toEqual({ required: true, foes: 2, result: null, passed: null });
  });

  it('does not count a foe parried after a failed maneuver, an interrupted action, or the same attacker', () => {
    const failed = parried('goblin', 0);
    failed.parries![0].parry = 20;
    failed.parries![0].parryManeuver = { required: true, foes: 1, result: 'failure', passed: false };
    const actions = [action('defender', 'melee_attack', 1), failed, parried('orc', 20, { status: 'interrupted' }), parried('wolf', 30)];
    const attackAction = action('wolf', 'melee_attack', 3, { attacks: [meleeAttack('defender')] });

    attackAction.processParryOptions([actor('defender')], actions, 3);

    // The wolf was already parried in an earlier action: the parry is carried over and needs no maneuver.
    expect(attackAction.parries![0]).toMatchObject({ carriedOver: true, parryManeuver: null });
    expect(Action.parriedFoes('defender', actions, 'wolf').size).toBe(0);
  });

  describe('declaring the maneuver', () => {
    const needing = (parry: number) => {
      const option = new ActionParry('p-1', 'defender', 'defender', 'parry', 100, parry);
      option.parryManeuver = { required: true, foes: 1, result: null, passed: null };
      return option;
    };

    it('lets the parry count with a success or better', () => {
      const option = needing(20);
      DeclareParryHandler.applyParryManeuver(option, new DeclareParryItem('p-1', 20, 'success'));
      expect(option).toMatchObject({ parry: 20, parryManeuver: { result: 'success', passed: true } });
    });

    it('has no effect below a success: the parry takes no OB', () => {
      const option = needing(20);
      DeclareParryHandler.applyParryManeuver(option, new DeclareParryItem('p-1', 20, 'partial-success'));
      expect(option).toMatchObject({ parry: 0, parryManeuver: { result: 'partial-success', passed: false } });
    });

    it('needs the result when the parry gives any OB, and only when the parry needs it', () => {
      expect(() => DeclareParryHandler.applyParryManeuver(needing(20), new DeclareParryItem('p-1', 20))).toThrow(
        expect.objectContaining({ code: 'err-parry-maneuver-required' }),
      );
      expect(() => DeclareParryHandler.applyParryManeuver(needing(0), new DeclareParryItem('p-1', 0))).not.toThrow();
      const free = new ActionParry('p-2', 'defender', 'defender', 'parry', 100, 20);
      expect(() => DeclareParryHandler.applyParryManeuver(free, new DeclareParryItem('p-2', 20, 'success'))).toThrow(
        expect.objectContaining({ code: 'err-parry-maneuver-not-needed' }),
      );
    });
  });
});

describe('Workspace spec 079, A5: fixed costs of Table 8-1', () => {
  it('gives each subtype its AP, multi-round above the 4 AP of a round', () => {
    const ap = Object.fromEntries(OTHER_ACTION_KINDS.map(kind => [kind, ActionApProfile.otherAp(kind)]));
    expect(ap).toEqual({
      'shift-item': 1,
      'pick-up': 3,
      'drop-prone': 2,
      'mount-dismount': 4,
      'string-bow': 6,
      'load-crossbow': 6,
      'pick-lock': 20,
      'disarm-trap': 20,
    });
    expect(ActionApProfile.otherAp('load-crossbow', true)).toBe(14);
    expect(ActionApProfile.fixed(4)).toEqual(new ActionApProfile(4, 4, 0, undefined));
    expect(ActionApProfile.fixed(14)).toEqual(new ActionApProfile(14, 14, 0, true));
  });

  it('reads the profile of an other action from its subtype, and keeps it in its continuation', () => {
    const plain = action('actor-1', 'other', 1);
    const lock = action('actor-1', 'other', 1, { otherAction: { kind: 'pick-lock', attackName: null, ap: 20 } });

    expect(plain.apProfile()).toEqual(new ActionApProfile(1, 1, 0));
    expect(lock.apProfile()).toMatchObject({ min: 20, max: 20, multiRound: true });
    expect(lock.roundEndOutcome(false)).toBe('carried');
    expect(Action.continuationOf(lock, 2, 4).otherAction).toEqual({ kind: 'pick-lock', attackName: null, ap: 20 });
  });

  describe('declaring the subtype', () => {
    const crossbow = (attackName: string, itemId: string | null = null) => {
      const ranged = new ActorRoundAttack(attackName, [], 50, 50, 'ranged', 'crossbow', 'bows', 0, 4, false, null, null);
      ranged.itemId = itemId;
      return ranged;
    };
    const round = (): ActorRound => {
      const actorRound = load({ attacks: [attack('mainHand', 60), crossbow('crossbow'), crossbow('ranged', 'item-9')] });
      actorRound.items = [
        {
          itemId: 'item-9',
          name: 'Big one',
          itemTypeId: 'heavy-crossbow',
          kind: 'weapon',
          strength: null,
          modifiers: [],
          startModifierIds: [],
        },
      ];
      return actorRound;
    };
    const command = (otherAction: CreateActionCommand['otherAction'], extra: Partial<CreateActionCommand> = {}) =>
      ({ actionType: 'other', freeAction: false, otherAction, ...extra }) as CreateActionCommand;

    it('takes the AP of the subtype', () => {
      expect(CreateActionHandler.otherAction(command({ kind: 'pick-up' }), round())).toEqual({ kind: 'pick-up', attackName: null, ap: 3 });
      expect(CreateActionHandler.otherAction(command(undefined), round())).toBeNull();
    });

    it('loads a light crossbow in 6 AP and a heavy one, by its item type, in 14', () => {
      expect(CreateActionHandler.otherAction(command({ kind: 'load-crossbow', attackName: 'crossbow' }), round())?.ap).toBe(6);
      expect(CreateActionHandler.otherAction(command({ kind: 'load-crossbow', attackName: 'ranged' }), round())?.ap).toBe(14);
    });

    it('rejects a crossbow load without a crossbow, an instantaneous one and a subtype of another action type', () => {
      const code: unknown = expect.objectContaining({ code: 'err-other-action-invalid' });
      expect(() => CreateActionHandler.otherAction(command({ kind: 'load-crossbow', attackName: 'mainHand' }), round())).toThrow(code);
      expect(() => CreateActionHandler.otherAction(command({ kind: 'load-crossbow' }), round())).toThrow(code);
      expect(() => CreateActionHandler.otherAction(command({ kind: 'pick-up' }, { freeAction: true }), round())).toThrow(code);
      expect(() => CreateActionHandler.otherAction(command({ kind: 'pick-up' }, { actionType: 'movement' }), round())).toThrow(code);
      expect(() => CreateActionHandler.otherAction(command({ kind: 'string-bow', attackName: 'nope' }), round())).toThrow(code);
    });
  });

  it('counts dropping prone and mounting as effort, not picking a lock (spec 079, A3)', () => {
    expect(Action.isEffort('other', 'drop-prone')).toBe(true);
    expect(Action.isEffort('other', 'pick-lock')).toBe(false);
    expect(Action.isEffort('movement')).toBe(true);
    expect(Action.isEffort('other')).toBe(false);
  });
});
