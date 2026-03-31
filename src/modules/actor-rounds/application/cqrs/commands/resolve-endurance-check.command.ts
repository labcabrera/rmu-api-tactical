import { KeyValueModifier } from '../../../../actions/domain/value-objects/key-value-modifier.vo';

export class ResolveEnduranceCheckCommand {
  constructor(
    public readonly roundActorId: string,
    public readonly alertId: string | undefined,
    public readonly roll: number,
    public readonly modifiers: KeyValueModifier[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
