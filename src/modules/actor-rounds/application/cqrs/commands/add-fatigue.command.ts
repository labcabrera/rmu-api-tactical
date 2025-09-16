export class AddFatigueCommand {
  constructor(
    public readonly actorId: string,
    public readonly round: number,
    public readonly fatigue: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
