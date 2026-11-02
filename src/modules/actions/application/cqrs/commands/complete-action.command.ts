/** What a full dodge action defends with (§9.6): the Movement skill, or the shield. */
export type FullDefenseType = 'dodge' | 'block';

export class CompleteActionCommand {
  constructor(
    public readonly actionId: string,
    /** Free text kept with the action (what an "other" action was, what was drawn...). */
    public readonly note: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
    /** Dodge actions only: a full dodge or a full block; `dodge` when missing. */
    public readonly defenseType?: FullDefenseType,
  ) {}
}
