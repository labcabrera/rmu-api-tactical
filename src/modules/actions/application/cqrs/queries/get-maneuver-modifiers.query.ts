export class GetManeuverModifiersQuery {
  constructor(
    public readonly actionId: string,
    /** Skill to roll with instead of the declared one. */
    public readonly skillId: string | undefined,
    public readonly specialization: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
