export class CompleteActionCommand {
  constructor(
    public readonly actionId: string,
    /** Free text kept with the action (what an "other" action was, what was drawn...). */
    public readonly note: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
