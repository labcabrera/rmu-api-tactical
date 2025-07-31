export interface CreateActionCommand {
  readonly gameId: string;
  readonly round: number;
  readonly characterId: string;
  readonly actionType: string;
  readonly phaseStart: number;
  readonly actionPoints: number;
}
