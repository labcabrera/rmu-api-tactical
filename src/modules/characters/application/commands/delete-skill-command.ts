export class DeleteSkillCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
