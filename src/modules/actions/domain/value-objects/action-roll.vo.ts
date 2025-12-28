import { KeyValueModifier } from './key-value-modifier.vo';

export class ActionRoll {
  constructor(
    public modifiers: KeyValueModifier[],
    public roll?: number,
    public totalRoll?: number,
  ) {}
}
