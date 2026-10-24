import { KeyValueModifier } from './key-value-modifier.vo.js';

export class ActionRoll {
  constructor(
    public modifiers: KeyValueModifier[],
    public roll: number | null,
    public totalRoll: number | null,
  ) {}
}
