export class DeclareActorParryCommand {
  constructor(
    /** Actor who is parrying */
    public readonly actorId: string,
    /** Actor who is attacking */
    public readonly sourceActorId: string,
    public readonly round: number,
    public readonly parry: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
