export class AddFatigueCommand {
  constructor(
    public readonly actorRoundId: string | undefined,
    public readonly actorId: string | undefined,
    public readonly round: number | undefined,
    public readonly fatigue: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {
    if (actorRoundId) {
      if (actorId || round) {
        throw new Error('If actorRoundId is provided, actorId and round must be undefined');
      }
    } else {
      if (actorId === undefined || round === undefined) {
        throw new Error('If actorRoundId is not provided, both actorId and round must be defined');
      }
    }
  }
}
