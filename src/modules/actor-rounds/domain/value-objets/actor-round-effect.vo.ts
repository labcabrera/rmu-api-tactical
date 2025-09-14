export class ActorRoundEffect {
  status: string;
  value: number | undefined;
  rounds: number | undefined;

  static isUnique(effect: ActorRoundEffect): boolean {
    switch (effect.status) {
      case 'death':
        return true;
    }
    return false;
  }
}
