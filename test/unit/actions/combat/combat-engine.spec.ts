import { describe, expect, it } from 'vitest';
import {
  CombatModifierBag,
  type CombatPlugin,
  CombatPluginRegistryService,
  CombatProcessor,
  rollModifiers,
  skip,
} from '../../../../src/modules/actions/application/services/combat/index.js';
import { createCombatPluginContext } from './combat-plugin-test.factory.js';

const plugin = (id: string, priority?: number, condition?: () => boolean): CombatPlugin => ({
  id,
  group: 'situation',
  hooks: {
    prepare: [{ priority, condition, apply: ctx => void rollModifiers(ctx).add(id, 1) }],
  },
});

const run = async (...plugins: CombatPlugin[]) => {
  const processor = new CombatProcessor(new CombatPluginRegistryService(plugins));
  const ctx = createCombatPluginContext();
  return processor.runPhase('prepare', ctx);
};

describe('CombatProcessor', () => {
  it('runs higher priorities first and keeps the registration order otherwise', async () => {
    const ctx = await run(plugin('first'), plugin('second'), plugin('urgent', 10));

    expect(ctx.trace.map(entry => entry.source)).toEqual(['urgent', 'first', 'second']);
  });

  it('skips the hooks whose condition does not hold', async () => {
    const ctx = await run(
      plugin('applies', 0, () => true),
      plugin('skipped', 0, () => false),
    );

    expect(ctx.trace.map(entry => entry.source)).toEqual(['applies']);
    expect(CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).has('skipped')).toBe(false);
  });

  it('stamps every modifier with the plugin and group that added it', async () => {
    const ctx = await run(plugin('cover'));

    const added = ctx.attackPreparation!.modifiers.rollModifiers.find(modifier => modifier.key === 'cover');
    expect(added).toMatchObject({ key: 'cover', value: 1, source: 'cover', group: 'situation' });
    expect(ctx.plugin).toBeUndefined();
  });

  it('keeps the reason of a hook that skips, with the rule of its plugin (spec 051)', async () => {
    const shield: CombatPlugin = {
      id: 'shield',
      group: 'defense',
      rule: '§9.6',
      hooks: { prepare: [{ condition: () => skip('shield-not-front', { position: 'flank' }), apply: () => undefined }] },
    };
    const ctx = await run(
      shield,
      plugin('silent', 0, () => false),
    );

    expect(ctx.skipped).toEqual([
      { source: 'shield', group: 'defense', reason: 'shield-not-front', phase: 'prepare', rule: '§9.6', params: { position: 'flank' } },
    ]);
    expect(ctx.trace).toEqual([]);
  });

  it('stamps the rule of the plugin and the params of the value on the modifier', async () => {
    const bd: CombatPlugin = {
      id: 'defensive-bonus',
      group: 'defense',
      rule: '§9.6',
      hooks: { prepare: [{ apply: ctx => void rollModifiers(ctx).add('bd', -30, { bd: 30 }) }] },
    };
    const ctx = await run(bd);

    expect(ctx.attackPreparation!.modifiers.rollModifiers[0]).toMatchObject({ key: 'bd', value: -30, rule: '§9.6', params: { bd: 30 } });
  });

  it('records the phase in the trace', async () => {
    const ctx = await run(plugin('cover'));

    expect(ctx.trace).toEqual([{ source: 'cover', message: 'prepare' }]);
  });
});

describe('CombatModifierBag', () => {
  it('ignores zero values', () => {
    const bag = CombatModifierBag.from().add('none', 0);

    expect(bag.toArray()).toEqual([]);
  });

  it('adds the part of a penalty that a skill cancels, never more than the penalty', () => {
    const partial = CombatModifierBag.from().addWithSkill('restricted-quarters', -50, 20);
    const capped = CombatModifierBag.from().addWithSkill('restricted-quarters', -25, 80);

    expect(partial.toArray().map(({ key, value }) => [key, value])).toEqual([
      ['restricted-quarters', -50],
      ['restricted-quarters-skill', 20],
    ]);
    expect(capped.sum()).toBe(0);
  });

  it('adds a negative skill whole, as a further penalty', () => {
    const bag = CombatModifierBag.from().addWithSkill('restricted-quarters', -100, -15);

    expect(bag.toArray().map(({ key, value }) => [key, value])).toEqual([
      ['restricted-quarters', -100],
      ['restricted-quarters-skill', -15],
    ]);
  });

  it('adds nothing for a zero modifier and no skill entry without skill', () => {
    expect(CombatModifierBag.from().addWithSkill('called-shot', 0, 30).toArray()).toHaveLength(0);
    expect(CombatModifierBag.from().addWithSkill('called-shot', -25, 0).toArray()).toHaveLength(1);
  });
});
