import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';

export class UpdateAttackRollCommand {
  constructor(
    public readonly actionId: string,
    public readonly attackName: string,
    public readonly roll: number,
    public readonly location: AttackLocation | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
