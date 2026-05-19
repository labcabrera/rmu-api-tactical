import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo';

export class CombatModifierBag {
  constructor(private readonly modifiers: KeyValueModifier[] = []) {}

  static from(modifiers: KeyValueModifier[] | undefined = undefined): CombatModifierBag {
    return new CombatModifierBag(modifiers || []);
  }

  add(key: string, value: number): CombatModifierBag {
    if (value === 0) {
      return this;
    }
    this.modifiers.push(new KeyValueModifier(key, value));
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
