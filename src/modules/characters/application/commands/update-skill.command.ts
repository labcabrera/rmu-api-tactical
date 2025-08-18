export class UpdateSkillCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly ranks?: number,
    public readonly customBonus?: number,
  ) {}
}
