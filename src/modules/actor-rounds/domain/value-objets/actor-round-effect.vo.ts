export class ActorRoundEffect {
  constructor(
    public readonly id: string,
    public readonly status: string,
    public value: number | undefined,
    public rounds: number | undefined,
  ) {}

  static isUnique(effect: ActorRoundEffect): boolean {
    switch (effect.status) {
      case 'dead':
      case 'unconcious':
        return true;
    }
    return false;
  }

  static isStackable(effect: ActorRoundEffect): boolean {
    switch (effect.status) {
      case 'penalty':
      case 'fatigue':
        return true;
    }
    return false;
  }
}
