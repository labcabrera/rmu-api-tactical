export class CreateActionCommand {
  constructor(
    public readonly gameId: string,
    public readonly characterId: string,
    public readonly actionType: string,
    public readonly phaseStart: number,
    public readonly actionPoints: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
