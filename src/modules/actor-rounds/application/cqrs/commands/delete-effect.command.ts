export class DeleteEffectCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly effectId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
