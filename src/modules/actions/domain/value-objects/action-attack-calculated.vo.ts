import { AttackLocation } from './attack-location.vo';
import { KeyValueModifier } from './key-value-modifier.vo';

export class ActionAttackCalculated {
  constructor(
    public rollModifiers: KeyValueModifier[],
    public rollTotal: number,
    public location: AttackLocation | undefined,
    public requiredLocationRoll: boolean,
    public criticalAdjustment: number | undefined = undefined,
    public criticalModifiers?: KeyValueModifier[],
    public breakageRoll?: boolean,
  ) {}
}
