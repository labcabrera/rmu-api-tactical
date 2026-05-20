export class CriticalEffect {
  constructor(
    public status: string,
    public rounds: number | undefined,
    public value: number | undefined,
    public delay: number | undefined,
    public condition: string | undefined,
  ) {}
}

export class CriticalResult {
  constructor(
    public message: string,
    public dmg: number,
    public location: string,
    public effects: CriticalEffect[],
  ) {}
}
