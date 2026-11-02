import { describe, expect, it } from 'vitest';
import { ResolveMovementHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-movement.handler.js';
import { PrepareAttackHandler } from '../../../../src/modules/actions/application/cqrs/handlers/prepare-attack.handler.js';
import type { PrepareAttackCommand } from '../../../../src/modules/actions/application/cqrs/commands/prepare-attack.command.js';
import { buildInjury, type Injury } from '../../../../src/modules/actor-rounds/domain/value-objects/injury.vo.js';
import { effect, load } from '../../actor-rounds/actor-round-test.factory.js';

const leg = (overrides: Partial<Injury>): Injury => ({
  ...buildInjury({ id: 'leg', type: 'bone', location: 'leg', penalty: -20, source: { kind: 'critical' } }),
  ...overrides,
});

const codes = (pace: string, round: ReturnType<typeof load>) => ResolveMovementHandler.paceWarnings(pace, round).map(each => each.code);

describe('pace of a movement against injuries and fear (workspace spec 068, decisions 5, 10 and 14)', () => {
  it('a splinted leg caps the pace', () => {
    const round = load({ injuries: [leg({ limits: { pace: 'walk' } })] });
    expect(codes('walk', round)).toEqual([]);
    expect(() => codes('jog', round)).toThrow(
      expect.objectContaining({ code: 'err-movement-injury-limit', details: { pace: 'jog', limit: 'walk' } }),
    );
  });

  it('routed and broken actors flee at running pace or faster', () => {
    const round = load({ effects: [effect('fear-broken', 10)] });
    expect(() => codes('jog', round)).toThrow(expect.objectContaining({ code: 'err-action-fear', details: { state: 'fear-broken' } }));
    expect(codes('run', round)).toEqual([]);
  });

  it('warns a balking actor above walking and a retreating one above jogging', () => {
    expect(codes('jog', load({ effects: [effect('fear-balk', 10)] }))).toEqual(['fear-balk-pace']);
    expect(codes('jog', load({ effects: [effect('fear-retreat', 10)] }))).toEqual([]);
    expect(codes('run', load({ effects: [effect('fear-retreat', 10)] }))).toEqual(['fear-retreat-pace']);
  });

  it('asks to confirm an exertion that reopens a completed pressure', () => {
    const round = load({ injuries: [leg({ reopenOn: 'exertion', reopenBleeding: 2 })] });
    expect(codes('walk', round)).toEqual([]);
    expect(ResolveMovementHandler.paceWarnings('jog', round)).toEqual([
      { code: 'exertion-reopens-wound', params: { injuryId: 'leg' }, requiresConfirm: true },
    ]);
  });
});

describe('charges of frightened attackers (workspace spec 068, decision 14)', () => {
  const charge = (chargeSpeed: string) => ({ attacks: [{ modifiers: { chargeSpeed } }] }) as unknown as PrepareAttackCommand;

  it('a retreating actor cannot charge, a balking one is warned', () => {
    expect(() => PrepareAttackHandler.chargeWarnings(charge('jog'), load({ effects: [effect('fear-retreat', 10)] }))).toThrow(
      expect.objectContaining({ code: 'err-action-fear', details: { state: 'fear-retreat' } }),
    );
    expect(PrepareAttackHandler.chargeWarnings(charge('sprint'), load({ effects: [effect('fear-balk', 10)] }))).toEqual([
      { code: 'fear-balk-charge', params: { state: 'fear-balk' }, requiresConfirm: false },
    ]);
    expect(PrepareAttackHandler.chargeWarnings(charge('none'), load({ effects: [effect('fear-retreat', 10)] }))).toEqual([]);
  });
});
