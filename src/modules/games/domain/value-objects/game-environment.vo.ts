export class GameEnvironment {
  constructor(
    public readonly temperatureFatigueModifier: number | undefined,
    public readonly altitudeFatigueModifier: number | undefined,
  ) {}
}
