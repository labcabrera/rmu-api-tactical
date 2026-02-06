import { KeyValueModifier } from '../../../../actions/domain/value-objects/key-value-modifier.vo';

export class ResolveEnduranceCheckCommand {
  constructor(
    public readonly roundActorId: string,
    public readonly alertId: string,
    public readonly roll: number,
    public readonly modifiers: KeyValueModifier[],
  ) {}
}
