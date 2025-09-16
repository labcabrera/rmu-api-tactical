export class DeclareParryCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly parry: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
