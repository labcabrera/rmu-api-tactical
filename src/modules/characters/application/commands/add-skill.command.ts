export class AddSkillCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly specialization: string | undefined,
    public readonly ranks: number,
    public readonly customBonus: number | undefined,
  ) {}
}
