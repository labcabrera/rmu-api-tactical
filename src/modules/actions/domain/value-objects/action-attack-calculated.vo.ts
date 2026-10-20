import { AttackLocation } from './attack-location.vo';
import { KeyValueModifier } from './key-value-modifier.vo';

export class ActionAttackCalculated {
  constructor(
    public rollModifiers: KeyValueModifier[],
    public rollTotal: number,
    /** Location hit: the called one; without a called shot no location is rolled (§9.7). */
    public location: AttackLocation | undefined,
    public criticalAdjustment: number | undefined = undefined,
    public criticalModifiers?: KeyValueModifier[],
    public breakageRoll?: boolean,
  ) {}
}
