export class DeleteSkillCommand {
  constructor(
    public readonly characterId: string,
    public readonly skillId: string,
  ) {}
}
