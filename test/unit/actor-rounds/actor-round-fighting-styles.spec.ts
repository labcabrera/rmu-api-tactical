import { describe, expect, it } from 'vitest';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { evaluateActiveStyle, evaluateEquipment } from '../../../src/modules/actor-rounds/domain/services/fighting-style-evaluator.js';
import { ActorRoundAttack, type WeaponCategory } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import type { FightingStyleCatalog } from '../../../src/modules/actor-rounds/domain/value-objects/fighting-style-catalog.vo.js';
import { ActorRoundShield } from '../../../src/modules/actor-rounds/domain/value-objects/actor-round-shield.vo.js';
import { load } from './actor-round-test.factory.js';

// Workspace spec 032: made-up styles with the shape of rmu-api-core, not the rulebook ones.
const weapon = (
  attackName: string,
  skillId: string,
  options: { twoHanded?: boolean; category?: WeaponCategory; tags?: string[]; type?: 'melee' | 'ranged' } = {},
) => {
  const attack = new ActorRoundAttack(
    attackName,
    [],
    50,
    50,
    options.type ?? 'melee',
    'table',
    'fumble',
    0,
    3,
    false,
    null,
    null,
    options.twoHanded ?? false,
    options.category ?? 'standard',
    skillId,
  );
  attack.weaponTags = options.tags ?? [];
  return attack;
};

const CATALOG: FightingStyleCatalog = {
  styles: [
    { id: 'fencing-like', skillId: 'combat-styles', abilities: [], equipment: [[{ kind: 'weapon-tag', value: 'fencing' }]] },
    { id: 'mounted-like', skillId: 'battle-styles', abilities: [], equipment: [[{ kind: 'mounted' }]] },
  ],
  abilities: [
    {
      id: 'lightning-reflexes',
      equipment: [[{ kind: 'unarmed' }], [{ kind: 'weapon-category', value: 'light' }], [{ kind: 'weapon-tag', value: 'fencing' }]],
    },
    { id: 'killing-strike', equipment: [[{ kind: 'melee' }]] },
  ],
};

const fencer = (attacks: ActorRoundAttack[]) => {
  const actor = load({ attacks, initiativeBase: 10 });
  actor.fightingStyles = [
    {
      skillId: 'combat-styles',
      styleId: 'fencing-like',
      ranks: 7,
      freeRanks: 3,
      abilities: [
        { abilityId: 'lightning-reflexes', times: 2 },
        { abilityId: 'killing-strike', times: 1 },
      ],
    },
  ];
  return actor;
};

describe('fighting style equipment (spec 032)', () => {
  it('finds the attacks of the weapons a style asks for', () => {
    const actor = load({
      attacks: [
        weapon('mainHand', 'melee-weapon@blade', { tags: ['fencing'] }),
        weapon('offHand', 'melee-weapon@blade', { category: 'dagger' }),
      ],
    });
    expect(evaluateEquipment(actor, [[{ kind: 'weapon-tag', value: 'fencing' }]])).toEqual({
      met: true,
      attackNames: ['mainHand'],
      warnings: [],
    });
    expect(evaluateEquipment(actor, [[{ kind: 'weapon-skill', value: 'melee-weapon' }]]).attackNames).toEqual(['mainHand', 'offHand']);
    expect(evaluateEquipment(actor, [[{ kind: 'two-weapons' }]])).toEqual({ met: true, attackNames: null, warnings: [] });
    expect(evaluateEquipment(actor, [[{ kind: 'unarmed' }]]).met).toBe(false);
    expect(evaluateEquipment(actor, [[{ kind: 'shield' }]]).met).toBe(false);
  });

  it('checks the shield, the armor and the two-handed weapons, and warns about what it cannot check', () => {
    const actor = load({
      attacks: [weapon('mainHand', 'melee-weapon@pole-arm', { twoHanded: true })],
      shield: new ActorRoundShield(20, 1, 0),
    });
    expect(evaluateEquipment(actor, [[{ kind: 'two-handed' }, { kind: 'melee' }]]).attackNames).toEqual(['mainHand']);
    expect(evaluateEquipment(actor, [[{ kind: 'no-shield' }]]).met).toBe(false);
    expect(evaluateEquipment(actor, [[{ kind: 'max-armor', value: '6' }]]).met).toBe(true);
    expect(evaluateEquipment(actor, [[{ kind: 'mounted' }]])).toEqual({ met: true, attackNames: null, warnings: ['mounted'] });
    expect(evaluateEquipment(load(), [[{ kind: 'unarmed' }]]).met).toBe(true);
  });
});

describe('active fighting style (spec 032)', () => {
  it('evaluates the style and its abilities and adds Lightning Reflexes to the initiative', () => {
    const actor = fencer([weapon('mainHand', 'melee-weapon@blade', { tags: ['fencing'] })]);
    const active = evaluateActiveStyle(actor, actor.fightingStyles[0], CATALOG, ['killing-strike']);
    expect(active).toMatchObject({ met: true, attackNames: ['mainHand'], freeRanksBonus: 6, options: ['killing-strike'] });

    actor.declareInitiative(8);
    expect(actor.initiative.total).toBe(18);
    actor.setActiveStyle(active);
    expect(actor.initiative).toMatchObject({ style: 10, total: 28 });
    actor.setActiveStyle(null);
    expect(actor.initiative).toMatchObject({ style: undefined, total: 18 });
  });

  it('gives nothing without the weapon of the style', () => {
    const actor = fencer([weapon('mainHand', 'melee-weapon@hafted')]);
    const active = evaluateActiveStyle(actor, actor.fightingStyles[0], CATALOG, []);
    expect(active.met).toBe(false);
    actor.setActiveStyle(active);
    actor.declareInitiative(8);
    expect(actor.initiative.style).toBeUndefined();
  });

  it('rejects unknown styles and options the style does not have', () => {
    const actor = fencer([weapon('mainHand', 'melee-weapon@blade', { tags: ['fencing'] })]);
    const unknown = { ...evaluateActiveStyle(actor, actor.fightingStyles[0], CATALOG, []), styleId: 'other' };
    expect(() => actor.setActiveStyle(unknown)).toThrow(/no ranks/);
    const style = { ...actor.fightingStyles[0], abilities: [] };
    expect(() => actor.setActiveStyle(evaluateActiveStyle(actor, style, CATALOG, ['killing-strike']))).toThrow(/cannot be declared/);
  });

  it('keeps the style in the next round, without the options of the round', () => {
    const actor = fencer([weapon('mainHand', 'melee-weapon@blade', { tags: ['fencing'] })]);
    actor.setActiveStyle(evaluateActiveStyle(actor, actor.fightingStyles[0], CATALOG, ['killing-strike']));
    const next = ActorRound.createFromPrevious(actor);
    expect(next.fightingStyles).toEqual(actor.fightingStyles);
    expect(next.activeStyle).toMatchObject({ styleId: 'fencing-like', met: true, options: [] });
    const reloaded = ActorRound.fromProps(next.getProps());
    expect(reloaded.activeStyle).toEqual(next.activeStyle);
  });
});
