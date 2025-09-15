export class ActorRoundEffect {
  constructor(
    public readonly status: string,
    public readonly value: number | undefined,
    public readonly rounds: number | undefined,
  ) {}

  static isUnique(effect: ActorRoundEffect): boolean {
    switch (effect.status) {
      case 'death':
        return true;
    }
    return false;
  }
}
