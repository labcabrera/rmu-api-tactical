import { describe, expect, it } from 'vitest';
import {
  SpellCastingService,
  type SpellActionContext,
} from '../../../src/modules/actions/application/services/spell/spell-casting.service.js';
import type { SpellcastingTablesPort } from '../../../src/modules/actions/application/ports/spellcasting-tables.port.js';
import type { SpellcastingTables } from '../../../src/modules/actions/domain/services/spell-casting.rules.js';
import type { ActionSpell } from '../../../src/modules/actions/domain/value-objects/action-spell.vo.js';

// Made-up numbers (not the book's Table 4-2): metal armour -2 per Enc % for Essence.
const column = (value: number | null) => ({ channeling: value, essence: value, mentalism: value });
const TABLES: SpellcastingTables = {
  columns: ['channeling', 'essence', 'mentalism'],
  subtlety: {},
  hands: { two: column(0) },
  voice: { normal: column(0) },
  helmet: {},
  armor: { metal: { ...column(0), essence: { perEncumbrancePercent: -2 } } },
  fastCastingPerAp: -25,
  overcastingPerLevel: -20,
  preparation: { perRound: 10, max: 20 },
};

const service = () =>
  new SpellCastingService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { findModifiers: () => Promise.resolve(TABLES) } as unknown as SpellcastingTablesPort,
    {} as never,
  );

const spell = (): ActionSpell => ({
  spell: {
    spellId: 'spell-1',
    name: 'Invented',
    level: 1,
    typeCode: 'E',
    type: 'elemental',
    subtype: null,
    instant: false,
    powerPoints: 1,
    listCode: 'invented-list',
    listName: 'Invented list',
    listRealms: ['essence'],
    resistance: null,
    range: null,
    area: null,
    duration: null,
    effects: [],
  },
  caster: { realms: ['essence'], realmStatBonus: 0, level: 3, listSkillId: 'base-spell-list', ranks: 5, listTypeModifier: 0 },
});

const context = (armorEncumbrance: number, actionSpell = spell()): SpellActionContext =>
  ({
    action: { apOf: () => 4, takesApPenalty: () => false },
    spell: actionSpell,
    currentPhase: 1,
    actorRound: { armorEncumbrance, traits: [], getPenaltiesBySource: () => [] },
  }) as unknown as SpellActionContext;

describe('SpellCastingService.calculate', () => {
  it('takes the Enc % of the worn armour of the actor round by default (workspace spec 077, B1.2)', async () => {
    const calculation = await service().calculate(context(15), { armor: 'metal' });

    expect(calculation.options.armorEncumbrance).toBe(15);
    expect(calculation.modifiers.find(modifier => modifier.key === 'armor')?.value).toBe(-30);
  });

  it('keeps the Enc % the caster sends', async () => {
    const calculation = await service().calculate(context(15), { armor: 'metal', armorEncumbrance: 5 });

    expect(calculation.options.armorEncumbrance).toBe(5);
  });
});
