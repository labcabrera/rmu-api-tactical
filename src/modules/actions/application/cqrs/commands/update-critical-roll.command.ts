export class UpdateCriticalRollCommand {
  constructor(
    public readonly actionId: string,
    public readonly attackName: string,
    public readonly criticalKey: string,
    public readonly roll: number,
    public readonly userId: string,
    public readonly roles: string[],
    /** Fighting style ability decided before the critical roll (workspace spec 032). */
    public readonly styleOption?: string,
  ) {}
}
