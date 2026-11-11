/**
 * Workspace spec 077, decision A2.4: the held actions of an actor whose concentration broke (a failed Mental Focus
 * maneuver) are interrupted.
 */
export class InterruptHeldActionsCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly actionIds: string[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
