import { Modifier } from '../../../shared/domain/entities/modifier.vo';
import { AttackLocation } from './attack-location.vo';

export class ActionAttackCalculated {
  constructor(
    public rollModifiers: Modifier[],
    public rollTotal: number,
    public location: AttackLocation | undefined,
    public requiredLocationRoll: boolean,
  ) {}
}
