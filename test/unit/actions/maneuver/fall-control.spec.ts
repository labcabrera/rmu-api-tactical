import { describe, expect, it } from 'vitest';
import {
  ManeuverRoll,
  ResolveManeuverCommand,
  ResolveManeuverRequest,
} from '../../../../src/modules/actions/application/cqrs/commands/resolve-maneuver.command.js';
import { ResolveManeuverHandler } from '../../../../src/modules/actions/application/cqrs/handlers/resolve-maneuver.handler.js';
import { fallControlSteps, fallControlStepsOf } from '../../../../src/modules/actions/domain/services/fall-control.js';
import { ApLedgerEntry } from '../../../../src/modules/actor-rounds/domain/value-objects/ap-ledger-entry.vo.js';
import { action, type ManeuverSetup, setupManeuver } from './maneuver-test.factory.js';

/* Workspace spec 077, decisions D4-D5: invented rolls and results. */

const resolve = async (options: ManeuverSetup, req: Partial<ResolveManeuverRequest> = {}) => {
  const setup = setupManeuver(options);
  const handler = new ResolveManeuverHandler(
    setup.gameRepository,
    setup.actorRoundRepository,
    setup.actionRepository,
    setup.eventBus,
    setup.maneuverPort,
    setup.contextService,
    setup.psychologyTables,
  );
  const result = await handler.execute(
    new ResolveManeuverCommand('action-1', Object.assign(new ResolveManeuverRequest('m', {}), req), new ManeuverRoll(60), 'user-1', []),
  );
  return { setup, result };
};

describe('fall-control maneuver (workspace spec 077, decision D4)', () => {
  it.each([
    ['absolute-failure', 1],
    ['failure', 0],
    ['partial-success', 0],
    ['success', -1],
    ['absolute-success', -2],
  ])('%s moves the critical of the fall %i steps', (result, steps) => {
    expect(fallControlSteps(result)).toBe(steps);
  });

  it('Acrobatics, instantaneous, at 0 AP and without AP penalty: a success keeps -1', async () => {
    const { result, setup } = await resolve(
      { skillId: 'acrobatics', freeAction: true, absolute: { result: 'success', message: 'Rolled', effects: [] } },
      { purpose: 'fall-control' },
    );
    expect(result.maneuver!.modifiers.purpose).toBe('fall-control');
    expect(result.maneuver!.result!.fallControlSteps).toBe(-1);
    expect(result.maneuver!.roll!.modifiers.some(modifier => modifier.key === 'action-points')).toBe(false);
    expect(result.status).toBe('completed');
    expect(result.apRange).toEqual({ min: 0, max: 0 });
    expect(setup.absolute).toHaveBeenCalled();
  });

  it('an instantaneous entry that took 1 AP becomes 0 AP', async () => {
    const { result, setup } = await resolve(
      {
        skillId: 'acrobatics',
        freeAction: true,
        actorRound: actorRound => actorRound.apLedger.push(new ApLedgerEntry(1, 'action-1', 1, 'instant')),
      },
      { purpose: 'fall-control' },
    );
    expect(result.actionPoints).toBe(0);
    expect(setup.actorRoundUpdate).toHaveBeenCalled();
  });

  it.each([
    [{ skillId: 'climbing', freeAction: true }, 'skill'],
    [{ skillId: 'acrobatics', freeAction: false }, 'not-instantaneous'],
  ])('rejects %p (err-fall-control-invalid, %s)', async (options, reason) => {
    await expect(resolve(options, { purpose: 'fall-control' })).rejects.toMatchObject({
      code: 'err-fall-control-invalid',
      details: { reason },
    });
  });

  it('a fall cites a resolved fall-control maneuver of the same actor', () => {
    const resolved = action({
      id: 'fc-1',
      status: 'completed',
      maneuver: {
        modifiers: { skillId: 'acrobatics', maneuverType: 'absolute', difficulty: 'm', purpose: 'fall-control' },
        result: { result: 'absolute-success', fallControlSteps: -2 },
      } as never,
    });
    expect(fallControlStepsOf(resolved, 'game-1', 'actor-1')).toBe(-2);
    expect(() => fallControlStepsOf(resolved, 'game-1', 'actor-2')).toThrow(expect.objectContaining({ code: 'err-fall-control-invalid' }));
    expect(() => fallControlStepsOf(null, 'game-1', 'actor-1')).toThrow(expect.objectContaining({ code: 'err-fall-control-invalid' }));
    const other = action({ id: 'm-2', status: 'completed', maneuver: { modifiers: { skillId: 'acrobatics' } } as never });
    expect(() => fallControlStepsOf(other, 'game-1', 'actor-1')).toThrow(expect.objectContaining({ details: { reason: 'purpose' } }));
  });
});

describe('fall-suggested alert (workspace spec 077, decision D5)', () => {
  it('an absolute failure of a climbing maneuver suggests a fall', async () => {
    const { setup } = await resolve({ skillId: 'climbing', absolute: { result: 'absolute-failure', message: 'Slipped', effects: [] } });
    const alert = setup.actorRound.alerts.find(each => each.type === 'fall-suggested');
    expect(alert?.getModifierText('skillId')).toBe('climbing');
    expect(alert?.getModifierText('origin')).toBe('maneuver');
    expect(alert?.getModifierText('actionId')).toBe('action-1');
  });

  it('a plain failure of a jumping maneuver, or an absolute failure of another skill, does not', async () => {
    const jump = await resolve({ skillId: 'jumping', absolute: { result: 'failure', message: 'Short', effects: [] } });
    expect(jump.setup.actorRound.alerts.some(each => each.type === 'fall-suggested')).toBe(false);
    const lore = await resolve({ skillId: 'old-lore', absolute: { result: 'absolute-failure', message: 'No', effects: [] } });
    expect(lore.setup.actorRound.alerts.some(each => each.type === 'fall-suggested')).toBe(false);
  });
});
