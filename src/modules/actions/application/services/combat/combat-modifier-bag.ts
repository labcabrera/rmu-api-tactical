import { KeyValueModifier, type ModifierGroup } from '../../../domain/value-objects/key-value-modifier.vo.js';

/** Plugin that adds the modifiers: stamped on each entry so the breakdown shows where every value comes from. */
export interface CombatModifierOrigin {
  source: string;
  group: ModifierGroup;
}

/** Mutable view over a list of modifiers (it edits the list in place). Zero values are never added. */
export class CombatModifierBag {
  constructor(
    private readonly modifiers: KeyValueModifier[] = [],
    private readonly origin?: CombatModifierOrigin,
  ) {}

  static from(modifiers: KeyValueModifier[] | undefined = undefined, origin?: CombatModifierOrigin): CombatModifierBag {
    return new CombatModifierBag(modifiers || [], origin);
  }

  add(key: string, value: number): CombatModifierBag {
    if (!value) {
      return this;
    }
    this.modifiers.push(new KeyValueModifier(key, value, this.origin?.group, this.origin?.source));
    return this;
  }

  /**
   * Adds a modifier and the skill's part of it: `<key>-skill` is min(|value|, skill). A positive skill offsets
   * the modifier up to its size; a negative skill adds its whole value as a further penalty.
   */
  addWithSkill(key: string, value: number, skill: number): CombatModifierBag {
    if (!value) {
      return this;
    }
    this.add(key, value);
    this.add(`${key}-skill`, Math.min(Math.abs(value), skill));
    return this;
  }

  remove(key: string): CombatModifierBag {
    const remaining = this.modifiers.filter(modifier => modifier.key !== key);
    this.modifiers.splice(0, this.modifiers.length, ...remaining);
    return this;
  }

  has(key: string): boolean {
    return this.modifiers.some(modifier => modifier.key === key);
  }

  value(key: string): number {
    return this.modifiers.filter(modifier => modifier.key === key).reduce((sum, modifier) => sum + modifier.value, 0);
  }

  sum(): number {
    return this.modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  }

  toArray(): KeyValueModifier[] {
    return this.modifiers;
  }
}
