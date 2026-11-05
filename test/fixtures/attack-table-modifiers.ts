import type { AttackTableModifiersPort } from '../../src/modules/actions/application/ports/attack-table.port.js';

/**
 * Made-up disarm and subdual modifiers of every attack table (workspace spec 079, A7): not the books' numbers. A table
 * named `fire-bolt` has none, like the bolts and balls.
 */
export const ATTACK_TABLE_MODIFIERS_FAKE: AttackTableModifiersPort = {
  modifiers: (attackTable: string) =>
    Promise.resolve(
      attackTable === 'fire-bolt'
        ? { disarm: null, subdual: null }
        : { disarm: { melee: -60, ranged: -160 }, subdual: { melee: -40, ranged: -90 } },
    ),
};
